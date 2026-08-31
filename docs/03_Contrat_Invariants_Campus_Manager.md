# Contrat Système & Invariants — Campus Manager

**Étape 3 de la chaîne méthodologique** — répond à : *que promet le système, que garantit-il toujours, qu'interdit-il absolument ?*
Ce contrat est indépendant de la technologie choisie (PostgreSQL, NestJS, PWA) — il doit rester vrai même si la stack change entièrement.

---

## 1. Les 4 questions centrales

### 1.1 Qui interagit ? (Acteurs)

- Étudiant, Enseignant, Gestionnaire de scolarité d'UFR, Admin `[V2]` (humains) — voir `02_SRS_Campus_Manager.md` §1.
- Le Système lui-même (moteur de conflits, notification, synchronisation) agit en tant qu'acteur non-humain, seul habilité à appliquer les invariants ci-dessous.

### 1.2 Qu'est-ce qui est promis ? (Capacités)

| Acteur | Le système promet de lui permettre de... |
|---|---|
| Étudiant | Consulter l'emploi du temps de son groupe ; être notifié de tout changement le concernant ; consulter hors-ligne les dernières données connues. |
| Enseignant | Consulter son planning dans chacune des UFR auxquelles il est rattaché ; signaler une absence ou demander un report/permutation ; suivre le statut de sa demande. |
| Gestionnaire de scolarité d'UFR | Gérer le référentiel et l'emploi du temps de **sa propre UFR uniquement** ; être alerté de tout conflit avant enregistrement ; valider/refuser les demandes enseignants de son UFR ; consulter le journal d'audit et le tableau de bord de son UFR. |
| Admin `[V2]` | Créer une UFR ; créer un compte Gestionnaire pour une UFR ; consulter (lecture seule) le référentiel, le planning, les conflits et l'audit de **toutes** les UFR ; transférer un Étudiant d'une UFR vers une autre. |

### 1.3 Qu'est-ce qui est garanti ? (Invariants — vrais en toute circonstance)

| ID | Invariant |
|---|---|
| INV-01 | Un créneau est toujours rattaché à exactement une salle, un horaire (jour + heure début + heure fin), un groupe, un enseignant et une UE. |
| INV-02 | Deux créneaux ne partagent jamais la même salle sur une plage horaire chevauchante sans qu'un conflit ait été détecté par le Système et, le cas échéant, une dérogation tracée avec motif. |
| INV-03 | Un compte utilisateur a toujours exactement un rôle parmi {Étudiant, Enseignant, Gestionnaire de scolarité, Admin} `[V2]`. Ce rôle n'est jamais choisi par l'utilisateur lui-même. |
| INV-04 | Une entrée du journal d'audit, une fois créée, est immuable : elle n'est jamais modifiée ni supprimée, quelle que soit l'action ultérieure sur le créneau concerné. |
| INV-05 | Un Étudiant n'a jamais de droit d'écriture sur une donnée d'emploi du temps, quel que soit le point d'entrée technique utilisé. |
| INV-06 | Toute modification ou annulation d'un créneau déjà publié déclenche toujours une notification vers les utilisateurs concernés. |
| INV-07 | L'identifiant d'un créneau, une fois créé, reste stable pendant toute sa durée de vie (nécessaire pour que l'audit trail et les notifications puissent le référencer sans ambiguïté). |
| INV-08 | Les données de la dernière synchronisation réussie d'un utilisateur restent lisibles par cet utilisateur même en l'absence de connexion réseau. |
| INV-09 `[V2]` | Un Étudiant est toujours rattaché à exactement une UFR — jamais zéro, jamais deux à la fois. |
| INV-10 `[V2]` | Un compte Gestionnaire de scolarité a toujours exactement une UFR associée ; un compte Admin n'a jamais d'UFR associée. |
| INV-11 `[V2]` | Un compte Admin n'a jamais de droit d'écriture sur le référentiel ou le planning d'une UFR quelconque — uniquement sur la création d'UFR/comptes Gestionnaire et le transfert d'UFR d'un Étudiant. |

### 1.4 Qu'est-ce qui est interdit ? (Contraintes strictes / refus explicites)

| ID | Interdit |
|---|---|
| INT-01 | Un Étudiant ne peut jamais créer, modifier ou annuler un créneau, quelle que soit l'interface utilisée. |
| INT-02 | Un compte Étudiant/Enseignant ne peut jamais être créé en libre-service ; il est toujours provisionné par le Gestionnaire de scolarité de l'UFR concernée. Un compte UFR/Gestionnaire ne peut jamais être créé autrement que par l'Admin `[V2]`. |
| INT-03 | Un créneau ne peut jamais être modifié ou annulé sans motif renseigné. |
| INT-04 | Un SMS ne peut jamais être envoyé pour une notification non classée "critique". |
| INT-05 | Une entrée du journal d'audit ne peut jamais être supprimée, y compris par un Gestionnaire de scolarité ou l'Admin. |
| INT-06 | Le Système ne doit jamais afficher à un Étudiant ou un Enseignant un créneau appartenant à un autre groupe / une autre UFR que le(s) sien(s). |
| INT-07 `[V2]` | Un Gestionnaire de scolarité ne peut jamais lire ou écrire le référentiel, le planning, les conflits ou l'audit d'une UFR autre que la sienne. |
| INT-08 `[V2]` | Un Étudiant déjà inscrit dans une UFR ne peut jamais être rattaché simultanément à une autre UFR ; seule une action explicite de l'Admin peut faire passer un Étudiant d'une UFR à une autre. |
| INT-09 `[V2]` | Seul l'Admin peut créer une UFR ou un compte Gestionnaire de scolarité ; ni un Gestionnaire, ni un Enseignant, ni un Étudiant ne peuvent le faire, quelle que soit l'interface utilisée. |

---

## 2. Le modèle de blindage (Entrées → Bouclier → Sorties)

Aucune sortie n'est produite tant que le bouclier n'a pas vérifié les invariants concernés. Exemple filé sur l'action la plus sensible du système — la création/modification d'un créneau :

```
ENTRÉE                    BOUCLIER (vérifications)                    SORTIE
────────────────────────────────────────────────────────────────────────────────
Requête de création  →    1. Le rôle de l'auteur est-il                →  Créneau enregistré
ou modification d'un         "Gestionnaire de scolarité" ?                   + entrée d'audit créée
créneau               →       (sinon : rejet, INT-01/INT-09)
                       →    2. L'UFR du créneau visé est-elle          →  Conflits détectés
                              celle du Gestionnaire authentifié ?             affichés (bloquant/
                              (sinon : rejet, INT-07) [V2]                    avertissement)
                       →    3. Un motif est-il fourni si                →  Notification déclenchée
                              modification/annulation ?                      vers les utilisateurs
                              (sinon : rejet, INT-03)                        concernés (INV-06)
                       →    4. Le moteur de conflits a-t-il été
                              exécuté (salle/enseignant/groupe/
                              capacité) ? (INV-02)
                       →    5. Si conflit bloquant : un motif de
                              dérogation est-il fourni ? (FR-CONF-07/08)
```

Conclusion du modèle : **le système ne doit jamais atteindre un état où deux créneaux occupent la même salle au même moment sans qu'une trace de dérogation explique pourquoi** (INV-02 + INV-04 combinés).

---

## 3. Checklist pratique (livrée par cette étape)

- [x] Tous les acteurs identifiés et leurs rôles définis (§1.1, et `02_SRS_Campus_Manager.md` §1)
- [x] Capacités principales listées, priorisées pour le MVP (§1.2)
- [x] Invariants métier et règles de sécurité documentés (§1.3)
- [x] Actions interdites et scénarios d'erreur explicitement listés (§1.4, et `02_SRS_Campus_Manager.md` §5)

## 4. Points ouverts non tranchés par ce contrat

Conformément au cahier des charges, ces points restent **explicitement non résolus** plutôt que devinés — ils devront faire l'objet d'un avenant à ce contrat une fois validés avec l'UJKZ :

- Localisation d'hébergement des données (cahier des charges §6.4).
- Durée de conservation du journal d'audit et des notifications (obligation légale CIL, §5/§6.4).
- **Arbitrage des conflits inter-UFR sur une salle commune/louée de la DEP** *(mis à jour 2026-08-27)* : la DEP est désormais modélisée comme structure gestionnaire (§1.1, FR-REF-03), mais le circuit qui tranche entre deux UFR — ou entre une UFR et la DEP — en cas de conflit sur une salle commune reste **non spécifié**, faute de compte dédié DEP pour l'instant (cf. `01_PRD_Campus_Manager.md` note 2026-08-27). Ces salles sont donc en pratique administrées par l'Admin le temps qu'un référent DEP soit désigné.
- Les 2 structures internes non identifiées mentionnées par le cahier des charges (§1.2, en sus de la DEP) restent hors périmètre.

---

*Document d'ingénierie — Étape 3/5. Chaque invariant listé ici doit avoir un "gardien" assigné à l'étape suivante (`04_Exigence_Architecture_Campus_Manager.md`).*
