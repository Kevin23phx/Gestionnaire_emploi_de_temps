# Contrat Système & Invariants — Campus Manager

**Étape 3 de la chaîne méthodologique** — répond à : *que promet le système, que garantit-il toujours, qu'interdit-il absolument ?*
Ce contrat est indépendant de la technologie choisie (PostgreSQL, NestJS, PWA) — il doit rester vrai même si la stack change entièrement.

---

## 1. Les 4 questions centrales

### 1.1 Qui interagit ? (Acteurs)

- Étudiant, Enseignant, Scolarité d'UFR (humains) — voir `02_SRS_Campus_Manager.md` §1.
- Le Système lui-même (moteur de conflits, notification, synchronisation) agit en tant qu'acteur non-humain, seul habilité à appliquer les invariants ci-dessous.

### 1.2 Qu'est-ce qui est promis ? (Capacités)

| Acteur | Le système promet de lui permettre de... |
|---|---|
| Étudiant | Consulter l'emploi du temps de son groupe ; être notifié de tout changement le concernant ; consulter hors-ligne les dernières données connues. |
| Enseignant | Consulter son planning ; signaler une absence ou demander un report/permutation ; suivre le statut de sa demande. |
| Scolarité d'UFR | Gérer le référentiel et l'emploi du temps de son UFR ; être alertée de tout conflit avant enregistrement ; valider/refuser les demandes enseignants ; consulter un journal d'audit et un tableau de bord. |

### 1.3 Qu'est-ce qui est garanti ? (Invariants — vrais en toute circonstance)

| ID | Invariant |
|---|---|
| INV-01 | Un créneau est toujours rattaché à exactement une salle, un horaire (jour + heure début + heure fin), un groupe, un enseignant et une UE. |
| INV-02 | Deux créneaux ne partagent jamais la même salle sur une plage horaire chevauchante sans qu'un conflit ait été détecté par le Système et, le cas échéant, une dérogation tracée avec motif. |
| INV-03 | Un compte utilisateur a toujours exactement un rôle parmi {Étudiant, Enseignant, Scolarité d'UFR}. Ce rôle n'est jamais choisi par l'utilisateur lui-même. |
| INV-04 | Une entrée du journal d'audit, une fois créée, est immuable : elle n'est jamais modifiée ni supprimée, quelle que soit l'action ultérieure sur le créneau concerné. |
| INV-05 | Un Étudiant n'a jamais de droit d'écriture sur une donnée d'emploi du temps, quel que soit le point d'entrée technique utilisé. |
| INV-06 | Toute modification ou annulation d'un créneau déjà publié déclenche toujours une notification vers les utilisateurs concernés. |
| INV-07 | L'identifiant d'un créneau, une fois créé, reste stable pendant toute sa durée de vie (nécessaire pour que l'audit trail et les notifications puissent le référencer sans ambiguïté). |
| INV-08 | Les données de la dernière synchronisation réussie d'un utilisateur restent lisibles par cet utilisateur même en l'absence de connexion réseau. |

### 1.4 Qu'est-ce qui est interdit ? (Contraintes strictes / refus explicites)

| ID | Interdit |
|---|---|
| INT-01 | Un Étudiant ne peut jamais créer, modifier ou annuler un créneau, quelle que soit l'interface utilisée. |
| INT-02 | Un compte ne peut jamais être créé en libre-service ; il est toujours provisionné par la Scolarité d'UFR. |
| INT-03 | Un créneau ne peut jamais être modifié ou annulé sans motif renseigné. |
| INT-04 | Un SMS ne peut jamais être envoyé pour une notification non classée "critique". |
| INT-05 | Une entrée du journal d'audit ne peut jamais être supprimée, y compris par la Scolarité d'UFR elle-même. |
| INT-06 | Le Système ne doit jamais afficher à un Étudiant ou un Enseignant un créneau appartenant à un autre groupe / une autre UFR que le sien. |

---

## 2. Le modèle de blindage (Entrées → Bouclier → Sorties)

Aucune sortie n'est produite tant que le bouclier n'a pas vérifié les invariants concernés. Exemple filé sur l'action la plus sensible du système — la création/modification d'un créneau :

```
ENTRÉE                    BOUCLIER (vérifications)                    SORTIE
────────────────────────────────────────────────────────────────────────────────
Requête de création  →    1. Le rôle de l'auteur est-il                →  Créneau enregistré
ou modification d'un         "Scolarité d'UFR" ? (sinon : rejet, INT-01)     + entrée d'audit créée
créneau               →    2. Un motif est-il fourni si                →  Conflits détectés
                              modification/annulation ?                     affichés (bloquant/
                              (sinon : rejet, INT-03)                       avertissement)
                       →    3. Le moteur de conflits a-t-il été         →  Notification déclenchée
                              exécuté (salle/enseignant/groupe/             vers les utilisateurs
                              capacité) ? (INV-02)                          concernés (INV-06)
                       →    4. Si conflit bloquant : un motif de
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
- Invariants applicables aux salles communes/louées et à l'arbitrage inter-structures (DEP + 2 structures non identifiées) — hors périmètre du MVP, à réintroduire en V2.

---

*Document d'ingénierie — Étape 3/5. Chaque invariant listé ici doit avoir un "gardien" assigné à l'étape suivante (`04_Exigence_Architecture_Campus_Manager.md`).*
