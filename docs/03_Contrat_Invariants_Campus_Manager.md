# Contrat Système & Invariants — Campus Manager

**Étape 3 de la chaîne méthodologique** — répond à : *que promet le système, que garantit-il toujours, qu'interdit-il absolument ?*
Ce contrat est indépendant de la technologie choisie (PostgreSQL, NestJS, PWA) — il doit rester vrai même si la stack change entièrement.

> **`[V3.2]` Révision du 2026-09-07 — le périmètre passe à 12 établissements.** Sur réception du référentiel officiel de l'UJKZ : 5 UFR, 6 instituts, 1 école doctorale, 53 départements (cf. `01_PRD`, note V3.2). **Aucun invariant n'est affaibli** : INV-10 (un Gestionnaire = un établissement) et INT-07 (cloisonnement) s'appliquent identiquement à un institut. Deux invariants s'ajoutent (INV-17, INV-18) pour ce que le nouveau référentiel des départements doit garantir. Le mot « UFR » employé dans les invariants ci-dessous se lit désormais « établissement ».

> **`[V3.1]` Révision du 2026-09-07 (même journée) — une garantie devient une déclaration.** Le référentiel nominatif des étudiants est supprimé (cf. `01_PRD`, note V3.1) : l'effectif d'un groupe est désormais **saisi**. C'est le seul endroit du contrat où le Système cesse de *garantir* pour se contenter d'*enregistrer ce qu'on lui dit*. INV-09 et INT-08 sont retirés ; RM-02 (conflit de capacité) survit dans son énoncé mais repose maintenant sur une donnée que le Système ne peut plus vérifier. Cette limite est explicite, elle n'est pas un effet de bord : elle a été acceptée en échange de la disparition d'un travail de saisie considérable.

> **`[V3]` Révision du 2026-09-07 — le contrat change de nature sur un point.** Jusqu'ici, une partie substantielle des garanties portait sur le **cloisonnement en lecture** : un Étudiant ne voit que son groupe, un Enseignant que son planning (INV-05, INT-01, INT-06). La V3 (cf. `01_PRD` note 2026-09-07) rend le programme **public** et supprime les comptes Étudiant/Enseignant : ce cloisonnement en lecture perd son objet et est **explicitement levé**, tandis que le cloisonnement en **écriture** est au contraire **élargi** — il ne protège plus contre « un étudiant authentifié » mais contre « n'importe qui sur Internet ». Les invariants concernés sont révisés ou retirés ci-dessous ; aucun n'est supprimé silencieusement.

---

## 1. Les 4 questions centrales

### 1.1 Qui interagit ? (Acteurs)

- **Visiteur public `[V3]`** (humain, non authentifié), Gestionnaire de scolarité d'UFR, Admin `[V2]` (humains) — voir `02_SRS_Campus_Manager.md` §1.
- ~~Étudiant, Enseignant~~ : `[V3]` retirés en tant qu'acteurs **authentifiés** (ils demeurent des entités du référentiel). L'un et l'autre interagissent désormais avec le système sous l'identité de **Visiteur public**.
- Le Système lui-même (moteur de conflits, notification, synchronisation) agit en tant qu'acteur non-humain, seul habilité à appliquer les invariants ci-dessous.

### 1.2 Qu'est-ce qui est promis ? (Capacités)

| Acteur | Le système promet de lui permettre de... |
|---|---|
| **Visiteur public** `[V3]` | Retrouver le programme de n'importe quel groupe de n'importe quelle UFR, sans compte, par la cascade UFR → filière → niveau → groupe ; le conserver en favori sur son appareil ; l'abonner à son agenda personnel et en recevoir automatiquement les évolutions ; l'activer en alerte ; le consulter hors-ligne. |
| ~~Étudiant~~ | ~~Consulter l'emploi du temps de son groupe ; être notifié de tout changement le concernant.~~ **`[V3]`** — ces capacités sont désormais offertes à tous, sans compte, via le Visiteur public. |
| ~~Enseignant~~ | ~~Consulter son planning ; signaler une absence ou demander un report/permutation ; suivre le statut de sa demande.~~ **`[V3]`** — la consultation passe par le Visiteur public ; le signalement sort du système (téléphone, cf. `02_SRS` §2.7). |
| Gestionnaire de scolarité d'UFR | Gérer le référentiel et l'emploi du temps de **sa propre UFR uniquement** ; être alerté de tout conflit avant enregistrement ; ~~valider/refuser les demandes enseignants de son UFR~~ *(`[V3]` retiré)* ; **`[V3.1]`** déclarer et corriger l'effectif d'un groupe ; **`[V3]`** annuler une séance à une date précise sans interrompre le créneau ; **`[V3]`** définir la période académique de son UFR ; **`[V3]`** rechercher et filtrer dans un référentiel volumineux ; consulter le journal d'audit et le tableau de bord de son UFR. |
| Admin `[V2]` | Créer une UFR ; créer un compte Gestionnaire pour une UFR ; consulter (lecture seule) le référentiel, le planning, les conflits et l'audit de **toutes** les UFR ; ~~transférer un Étudiant d'une UFR vers une autre~~ *(`[V3.1]` retiré, sans objet)*. |

### 1.3 Qu'est-ce qui est garanti ? (Invariants — vrais en toute circonstance)

| ID | Invariant |
|---|---|
| INV-01 | Un créneau est toujours rattaché à exactement une salle, un horaire (jour + heure début + heure fin), un groupe, un enseignant et une UE. |
| INV-02 | Deux créneaux ne partagent jamais la même salle sur une plage horaire chevauchante sans qu'un conflit ait été détecté par le Système et, le cas échéant, une dérogation tracée avec motif. |
| INV-03 `[V3, révisé]` | Un compte utilisateur a toujours exactement un rôle parmi **{Gestionnaire de scolarité, Admin}**. Ce rôle n'est jamais choisi par l'utilisateur lui-même. *(V2 : {Étudiant, Enseignant, Gestionnaire de scolarité, Admin}.)* |
| INV-04 | Une entrée du journal d'audit, une fois créée, est immuable : elle n'est jamais modifiée ni supprimée, quelle que soit l'action ultérieure sur le créneau concerné. |
| INV-05 `[V3, révisé et élargi]` | **Aucune requête non authentifiée** n'a jamais de droit d'écriture sur une quelconque donnée du système, quel que soit le point d'entrée technique utilisé. *(V2 : « un Étudiant » — la garantie ne dépend plus de l'existence d'un compte étudiant à contraindre, elle porte sur l'ensemble du trafic anonyme, ce qui la rend strictement plus forte.)* |
| INV-06 `[V3, révisé]` | Toute modification ou annulation d'un créneau déjà publié est **immédiatement reflétée dans le programme public du groupe concerné**, dans le flux d'agenda de ce groupe, et déclenche l'alerte des visiteurs l'ayant activée. *(V2 : « déclenche une notification vers les utilisateurs concernés » — il n'y a plus d'utilisateurs nominatifs ; la garantie devient celle de la cohérence du programme publié, qui est ce que l'utilisateur observe réellement.)* |
| INV-07 | L'identifiant d'un créneau, une fois créé, reste stable pendant toute sa durée de vie (nécessaire pour que l'audit trail et les notifications puissent le référencer sans ambiguïté). |
| INV-08 | Les données de la dernière synchronisation réussie d'un utilisateur restent lisibles par cet utilisateur même en l'absence de connexion réseau. |
| ~~INV-09~~ `[V2]` | ~~Un Étudiant est toujours rattaché à exactement une UFR.~~ **`[V3.1]` Retiré** — il n'existe plus d'Étudiant en base. |
| INV-17 `[V3.2]` | Deux départements d'un même établissement ne portent jamais le même libellé, à la casse près. C'est la garantie qui empêche « Informatique » et « informatique » d'apparaître comme deux filières distinctes dans la cascade publique (FR-PUB-02). Le même libellé dans deux établissements différents reste légitime — « Informatique » existe réellement à l'UFR/SEA et à l'IBAM. |
| INV-18 `[V3.2]` | Le sigle affiché d'un établissement se dérive toujours de son type ; il n'est jamais stocké. Un institut ne peut donc pas se retrouver affiché « UFR/IBAM ». |
| INV-16 `[V3.1]` | L'effectif d'un groupe est toujours un entier positif ou nul. Le Système ne garantit rien de plus à son sujet : il n'a aucun moyen de vérifier qu'il correspond à la réalité, et un effectif nul rend simplement muette la détection de conflit de capacité pour ce groupe. |
| INV-10 `[V2]` | Un compte Gestionnaire de scolarité a toujours exactement une UFR associée ; un compte Admin n'a jamais d'UFR associée. |
| INV-11 `[V2]` | Un compte Admin n'a jamais de droit d'écriture sur le référentiel ou le planning d'une UFR quelconque — uniquement sur la création d'UFR/comptes Gestionnaire et le transfert d'UFR d'un Étudiant. |
| INV-12 `[V3]` | Un créneau visible sur le programme public ne porte jamais de donnée nominative d'étudiant : ni INE, ni nom, ni liste des inscrits. Ce qui est publié se limite à l'UE, l'enseignant, la salle, l'horaire, le statut et son motif. |
| INV-13 `[V3]` | L'adresse d'abonnement calendrier d'un groupe est stable pendant toute la durée de vie de ce groupe : elle ne change jamais du fait d'une modification, d'un ajout ou d'une suppression de créneau. Un visiteur abonné une fois n'a jamais à se réabonner. |
| INV-14 `[V3]` | Une séance annulée à une date précise laisse toujours le créneau qui la porte actif pour ses autres dates. Annuler une occurrence ne supprime jamais le cours du reste de la période académique. |
| INV-15 `[V3]` | Une séance annulée ou modifiée reste toujours visible, signalée comme telle et accompagnée de son motif, aussi bien sur le programme public que dans un agenda abonné. Elle ne disparaît jamais silencieusement — la disparition priverait l'utilisateur de l'information même que le système existe pour transmettre. |

### 1.4 Qu'est-ce qui est interdit ? (Contraintes strictes / refus explicites)

| ID | Interdit |
|---|---|
| INT-01 `[V3, révisé et élargi]` | Un **Visiteur public** ne peut jamais créer, modifier ou annuler quoi que ce soit — créneau, référentiel, ou toute autre donnée — quelle que soit l'interface utilisée. *(V2 : « un Étudiant ».)* |
| INT-02 `[V3, révisé]` | Aucun compte ne peut jamais être créé en libre-service. **Les seuls comptes du système sont Gestionnaire et Admin, et seul l'Admin peut les créer.** *(La clause V2 sur le provisionnement des comptes Étudiant/Enseignant par le Gestionnaire est caduque : ces comptes n'existent plus.)* |
| INT-03 | Un créneau ne peut jamais être modifié ou annulé sans motif renseigné. |
| ~~INT-04~~ | ~~Un SMS ne peut jamais être envoyé pour une notification non classée "critique".~~ **`[V3]` Retirée** — le canal SMS est supprimé (`02_SRS` FR-NOTIF-03/04 retirées) : sans comptes, le système ne détient plus de coordonnées personnelles, et la contrainte devient sans objet. |
| INT-05 | Une entrée du journal d'audit ne peut jamais être supprimée, y compris par un Gestionnaire de scolarité ou l'Admin. |
| ~~INT-06~~ | ~~Le Système ne doit jamais afficher à un Étudiant ou un Enseignant un créneau appartenant à un autre groupe / une autre UFR que le(s) sien(s).~~ **`[V3]` Retirée, et délibérément inversée** : tout programme est désormais public (`02_SRS` FR-PUB-01), c'est l'objet même de la V3. Ce qui subsistait de légitime dans cette interdiction — ne pas exposer de données personnelles d'étudiants — est repris et renforcé par INV-12 et INT-10. **INT-07 (cloisonnement inter-UFR du Gestionnaire) reste entièrement en vigueur** : lever le cloisonnement en lecture pour le public ne lève rien du tout côté écriture. |
| INT-07 `[V2]` | Un Gestionnaire de scolarité ne peut jamais lire ou écrire le référentiel, le planning, les conflits ou l'audit d'une UFR autre que la sienne. |
| ~~INT-08~~ `[V2]` | ~~Un Étudiant déjà inscrit dans une UFR ne peut jamais être rattaché simultanément à une autre.~~ **`[V3.1]` Retiré** avec le référentiel nominatif. |
| INT-09 `[V2, révisé V3]` | Seul l'Admin peut créer une UFR ou un compte Gestionnaire de scolarité ; ni un Gestionnaire, ni un Visiteur public ne peuvent le faire, quelle que soit l'interface utilisée. |
| INT-10 `[V3]` | Le référentiel des étudiants (INE, noms, composition nominative des groupes) ne peut jamais être atteint par une requête non authentifiée, quel que soit le point d'entrée — y compris indirectement, par un champ dérivé exposé sur le programme public. |
| INT-11 `[V3]` | Une occurrence datée ne peut jamais être annulée en dehors des bornes de la période académique de l'UFR concernée : on n'annule pas une séance qui n'a jamais été programmée. |

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

**`[V3]` Second exemple filé — la lecture publique**, devenue le chemin le plus emprunté du système et le seul ouvert sur l'extérieur :

```
ENTRÉE                    BOUCLIER (vérifications)                    SORTIE
────────────────────────────────────────────────────────────────────────────────
Requête anonyme de   →    1. La méthode est-elle une lecture ?      →  Programme du groupe
consultation d'un            (sinon : rejet inconditionnel,               (UE, enseignant, salle,
programme                     INV-05/INT-01) [V3]                          horaire, statut, motif)
                      →    2. La ressource demandée fait-elle       →  Flux d'agenda du groupe,
                             partie de la surface publique                 adresse stable (INV-13)
                             déclarée ? (sinon : rejet, INT-10)
                      →    3. La projection retirée-t-elle toute
                             donnée nominative d'étudiant ?
                             (INV-12) [V3]
                      →    4. Les séances annulées/modifiées
                             sont-elles conservées et signalées,
                             jamais omises ? (INV-15) [V3]
```

Conclusion du modèle : **le système ne doit jamais atteindre un état où deux créneaux occupent la même salle au même moment sans qu'une trace de dérogation explique pourquoi** (INV-02 + INV-04 combinés). **`[V3]`** Et symétriquement, du côté ouvert : **aucune requête anonyme ne doit jamais pouvoir écrire, ni lire autre chose qu'un programme débarrassé de toute donnée nominative d'étudiant** (INV-05 + INV-12 + INT-10 combinés).

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
- **`[V3]` Délai réel de propagation vers un agenda personnel** : le système garantit qu'il publie immédiatement (INV-06), mais la fréquence à laquelle un fournisseur d'agenda tiers vient relire le flux lui échappe entièrement et peut atteindre plusieurs heures. Le contrat ne peut donc pas promettre « moins d'une minute » sur ce canal — c'est l'alerte navigateur et la consultation directe qui portent cette promesse (`02_SRS` FR-NOTIF-05). À rediscuter avec l'UJKZ si le délai constaté en usage réel s'avère problématique.
- **`[V3]` Durée de conservation d'une séance annulée dans le programme publié** : INV-15 impose de la conserver visible, sans fixer combien de temps. La valeur retenue en implémentation (une semaine après la date de la séance) est un défaut technique, pas un engagement contractuel — à confirmer avec la scolarité après un semestre d'usage.
- **`[V3]` Abus de la surface publique** : le programme étant ouvert sans authentification, la limitation du débit de requêtes et la protection contre l'aspiration massive relèvent de l'exploitation, non de ce contrat. Aucun seuil n'est fixé ici tant que l'hébergement n'est pas arrêté (cf. premier point de cette liste).

---

*Document d'ingénierie — Étape 3/5, révision V3 du 2026-09-07. Chaque invariant listé ici doit avoir un "gardien" assigné à l'étape suivante (`04_Exigence_Architecture_Campus_Manager.md`).*
