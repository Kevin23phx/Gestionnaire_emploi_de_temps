# Transition Exigence → Architecture — Campus Manager

**Étape 4 de la chaîne méthodologique** — répond à : *qui est responsable de faire respecter chaque garantie, et où cette responsabilité doit-elle vivre dans le système ?*

Chaîne appliquée à chaque invariant/exigence retenu : **Exigence → Garantie → Responsabilité → Composant**.
Changement de posture attendu : ne pas demander *"où est-ce que je code ça ?"* mais *"qui doit porter cette responsabilité pour que la garantie reste vraie ?"*.

Stack de référence (cahier des charges §6.1) : backend **NestJS**, base **PostgreSQL**, interface **PWA**, temps réel via **LISTEN/NOTIFY PostgreSQL + Service Worker**.

---

| # | Exigence source | Garantie ("Le Système...") | Responsabilité (propriétaire unique) | Composant |
|---|---|---|---|---|
| 1 | INV-03 / FR-AUTH-02 | ...DOIT résoudre le rôle d'un utilisateur uniquement à partir de son compte côté serveur, jamais depuis une entrée client. | Le Service d'Authentification est seul habilité à émettre le rôle d'une session. | `AuthModule` (NestJS) ; colonne `role` non modifiable via API publique. |
| 2 | INT-02 / FR-AUTH-04 | ...NE DOIT PAS créer de compte hors d'un import de référentiel par la Scolarité. | Le Service de Provisionnement de Comptes est l'unique point d'entrée de création de compte. | `AccountsModule` (NestJS), endpoint d'import protégé par guard RBAC (rôle Scolarité d'UFR uniquement). |
| 3 | INV-02 / FR-CONF-01→04 | ...DOIT évaluer les 4 types de conflit avant toute écriture d'un créneau. | Le Moteur de Détection de Conflits est seul responsable du calcul des chevauchements et de la comparaison capacité/effectif. | `ConflictEngineModule` (NestJS) + contrainte d'exclusion PostgreSQL (`EXCLUDE USING gist` sur salle × plage horaire) comme filet de sécurité en base. |
| 4 | INT-03 / FR-EDT-02/03 | ...DOIT rejeter toute modification/annulation de créneau dont le motif est vide. | Le Service de Planification valide la présence du motif avant persistance. | `PlanningModule` (NestJS) — validation DTO + contrainte `NOT NULL` en base sur la colonne motif. |
| 5 | INV-04 / INT-05 | ...NE DOIT PAS exposer d'opération de mise à jour ou de suppression sur une entrée d'audit. | Le Service d'Audit est seul autorisé à écrire dans le journal, en écriture seule (append-only). | `AuditModule` (NestJS, INSERT uniquement) + table `audit_log` sans privilège `UPDATE`/`DELETE` accordé au rôle applicatif PostgreSQL. |
| 6 | INV-06 / FR-NOTIF-01 | ...DOIT déclencher une notification vers chaque utilisateur concerné dès l'enregistrement d'un changement, sans action manuelle. | Le Service de Notification s'abonne aux événements de changement de créneau. | `NotificationModule` (NestJS) + `LISTEN/NOTIFY` PostgreSQL + Service Worker (PWA) côté réception. |
| 7 | NFR-DISPO-01 / INV-08 | ...DOIT permettre la lecture de l'emploi du temps sans requête réseau, à partir du cache local. | Le Service Worker gère le cache local et l'indicateur de fraîcheur, indépendamment de l'API. | Service Worker + IndexedDB (PWA) ; `SyncModule` (NestJS) côté serveur pour la file de synchronisation différée. |
| 8 | INT-06 / FR-EDT-06 | ...NE DOIT PAS retourner de données d'un groupe autre que celui de l'utilisateur authentifié. | La couche d'autorisation filtre chaque lecture par le périmètre de l'utilisateur avant exécution. | RBAC Guard (NestJS, appliqué sur `PlanningModule`) + clause systématique `group_id = user.group_id`. |
| 9 | FR-SIG-01/02 | ...DOIT garder une demande enseignant "en attente" jusqu'à décision explicite de la Scolarité. | Le Service de Gestion des Demandes gère la transition d'état et la propagation vers le planning une fois validée. | `RequestModule` (NestJS) — machine à états à 3 valeurs (RM-04). |
| 10 | NFR-PERF-01 | ...DOIT répondre aux lectures sous le seuil p95 même en pic de charge (rentrée). | La couche de lecture est isolée de la couche d'écriture pour absorber la charge de consultation sans dégrader la détection de conflits. | API de lecture mise en cache devant PostgreSQL ; tests de charge avant chaque rentrée (cahier des charges §7). |

---

## Méthode appliquée (rappel des 5 étapes du guide)

1. **Nature identifiée** pour chaque ligne : règle métier (ex. #3, #4), invariant de sécurité (#1, #2, #8), politique (#5, #9), contrainte technique (#7, #10).
2. **Transformée en garantie** à la voix du système ("Le Système DOIT/NE DOIT PAS...").
3. **Une seule responsabilité principale assignée** par ligne — jamais partagée entre deux modules, pour éviter qu'aucun ne soit réellement comptable (ex. la détection de conflit appartient à `ConflictEngineModule` seul, pas à `PlanningModule`, même si ce dernier l'invoque).
4. **Regroupement par cohésion** : tout ce qui touche à la construction/modification d'un créneau reste dans `PlanningModule` ; tout ce qui touche à la décision "ce créneau est-il valide ?" est séparé dans `ConflictEngineModule` — ces deux responsabilités évoluent à des rythmes différents (les règles de conflit peuvent changer sans toucher au CRUD de créneau, et inversement).
5. **Composants émergents** : les modules listés ci-dessus (Auth, Accounts, Planning, ConflictEngine, Audit, Notification, Request, Sync) forment la liste d'entrée du C4 Composant (étape 5).

---

*Document d'ingénierie — Étape 4/5. Cette table alimente directement les diagrammes UML et C4 de l'étape suivante (`05_UML_C4_Campus_Manager.md`).*
