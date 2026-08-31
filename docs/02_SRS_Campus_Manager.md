# SRS — Campus Manager (V2, multi-UFR)

**Étape 2 de la chaîne méthodologique** — répond à : *que doit garantir le système, exactement, sans dire comment ?*
Vocabulaire normatif RFC 2119 : **DOIT** (obligation absolue) · **NE DOIT PAS** (interdiction absolue) · **DEVRAIT** (forte recommandation) · **PEUT** (optionnel).

Périmètre : **V2 multi-UFR** à 4 acteurs (Étudiant, Enseignant, Gestionnaire de scolarité d'UFR, Admin), 5 UFR (SH, SDS, SVT, SEA, LAC — cf. `01_PRD_Campus_Manager.md`, note de cadrage 2026-08-27), salles communes/louées rattachées à la DEP mais sans arbitrage inter-UFR automatisé, aucun acteur DSI. Les exigences héritées du MVP à une seule UFR (décision de cadrage du 2026-08-11) restent valables mais sont désormais **scopées par UFR** — les changements sont marqués `[V2]`.

---

## 1. Acteurs

| Acteur | Type | Rôle |
|---|---|---|
| Étudiant | Humain | Lecture seule sur l'emploi du temps de son propre groupe ; rattaché à exactement une UFR |
| Enseignant | Humain | Lecture sur son propre planning, écriture limitée (signalements soumis à validation) ; peut être rattaché à plusieurs UFR |
| Gestionnaire de scolarité d'UFR *(anciennement "Scolarité d'UFR")* | Humain | Contrôle total sur le référentiel et l'emploi du temps de sa propre UFR uniquement |
| Admin `[V2]` | Humain | Crée les UFR et les comptes Gestionnaire associés ; supervise (lecture seule) le référentiel, le planning et l'audit de toutes les UFR ; n'a aucun droit d'écriture sur le référentiel/planning d'une UFR |
| Système (moteur de conflits, notification, synchronisation) | Non-humain | Applique automatiquement les règles ci-dessous, sans intervention humaine |

## 2. Exigences fonctionnelles

### 2.1 Authentification et comptes

| ID | Exigence |
|---|---|
| FR-AUTH-01 | Le Système DOIT permettre à un Étudiant, un Enseignant, un Gestionnaire de scolarité ou un Admin de s'authentifier par identifiant et mot de passe. |
| FR-AUTH-02 | Le Système DOIT déterminer automatiquement le rôle de l'utilisateur authentifié à partir de son compte, sans que l'utilisateur ait à le sélectionner. |
| FR-AUTH-03 | Le Système DOIT permettre à un utilisateur disposant d'un compte pré-provisionné (matricule fourni par la scolarité) d'activer ce compte en définissant un mot de passe lors de sa première connexion. |
| FR-AUTH-04 | Le Système NE DOIT PAS permettre la création d'un compte en libre-service. Les comptes Étudiant/Enseignant sont provisionnés exclusivement par le Gestionnaire de scolarité de l'UFR concernée (import de référentiel, cf. FR-REF-01) ; les comptes UFR et Gestionnaire sont provisionnés exclusivement par l'Admin (cf. FR-ADMIN-02). |

### 2.1bis Administration multi-UFR `[V2]`

| ID | Exigence |
|---|---|
| FR-ADMIN-01 | Le Système DOIT permettre à l'Admin de créer une nouvelle UFR (nom, sigle). |
| FR-ADMIN-02 | Le Système DOIT permettre à l'Admin de créer, pour une UFR donnée, un compte Gestionnaire de scolarité pré-provisionné, avec un identifiant de la forme `scolarite.<sigle-ufr>` (sigle en minuscules, ex. `scolarite.svt`) — ce compte suit le même mécanisme d'activation que FR-AUTH-03. |
| FR-ADMIN-03 | Le Système DOIT donner à l'Admin un accès en lecture seule au référentiel, au planning, aux conflits et au journal d'audit de **toutes** les UFR. |
| FR-ADMIN-04 | Le Système NE DOIT PAS permettre à l'Admin de créer, modifier ou annuler directement un créneau, une salle, un cours ou une affectation d'étudiant dans une UFR — ces actions restent la responsabilité exclusive du Gestionnaire de l'UFR concernée. |
| FR-ADMIN-05 | Le Système DOIT permettre uniquement à l'Admin (jamais à un Gestionnaire d'UFR) de transférer un Étudiant déjà inscrit d'une UFR vers une autre. |

### 2.2 Référentiel académique

| ID | Exigence |
|---|---|
| FR-REF-01 | Le Système DOIT permettre à un Gestionnaire de scolarité d'importer les référentiels (filières, niveaux, groupes, UE, salles, enseignants) de **sa propre UFR** via un fichier structuré (Excel/CSV). |
| FR-REF-02 | Le Système DOIT permettre à un Gestionnaire de scolarité de créer/modifier une salle de sa propre UFR avec au minimum : nom, capacité d'accueil, structure gestionnaire, type d'usage. |
| FR-REF-03 | Chaque salle DOIT être rattachée à exactement une structure gestionnaire : une UFR (parmi les 5), ou la DEP pour les salles communes/louées `[V2]` (pour le MVP à une seule UFR, ce champ valait toujours l'UFR pilote). |
| FR-REF-04 | Le Système DOIT permettre à un Gestionnaire de scolarité de provisionner un compte enseignant (nom, prénom, identifiant) directement depuis l'écran de création de créneau, lorsque l'enseignant n'existe pas encore dans le référentiel. |
| FR-REF-05 | Ce compte enseignant provisionné via FR-REF-04 NE DOIT PAS être créé avec un mot de passe saisi par le Gestionnaire. Il DOIT rester dans l'état "non activé" jusqu'à ce que l'enseignant l'active lui-même (FR-AUTH-03). |
| FR-REF-06 `[V2, révisé 2026-08-27]` | Le Système NE DOIT JAMAIS empêcher un Gestionnaire d'affecter un Enseignant à un créneau au motif qu'il n'est pas encore rattaché à son UFR — tout Enseignant capable de dispenser un cours DOIT pouvoir intervenir dans n'importe quelle UFR. L'affectation (table EnseignantUfr) DOIT néanmoins être enregistrée automatiquement à la première utilisation d'un Enseignant dans une UFR donnée, pour que son planning agrégé (toutes UFR confondues) reste exact — c'est une trace, jamais une porte d'entrée bloquante. |
| FR-REF-07 `[V2]` | Le Système DOIT rattacher chaque Étudiant à exactement une UFR. Un import ou une affectation qui rattacherait un Étudiant à une UFR différente de celle qu'il a déjà DOIT être rejeté, sauf s'il est réalisé par l'Admin (cf. FR-ADMIN-05). |
| FR-REF-08 `[V2]` | Le Système NE DOIT PAS permettre d'importer deux fois le même Étudiant (même INE) dans le référentiel — un INE déjà présent dans le référentiel DOIT être signalé comme doublon et rejeté à l'import, quelle que soit l'UFR ou l'année visée par le nouvel import (comportement déjà garanti par l'unicité de l'INE, formalisé ici comme exigence). |
| FR-REF-09 `[V2]` | Le Système DOIT enregistrer, pour chaque Étudiant importé, l'année académique de son inscription, à des fins de traçabilité et de filtrage (cf. FR-REF-11) — sans quoi FR-REF-11 ne peut pas filtrer par année. |
| FR-REF-10 `[V2]` | Le Système DOIT permettre à un Gestionnaire de scolarité de télécharger, depuis l'écran de rattachement d'étudiants à un groupe, un fichier modèle (canevas, .xlsx) présentant les colonnes attendues pour l'import (INE, nom, prénom, filière, niveau, année académique). |
| FR-REF-11 `[V2]` | Le Système DOIT permettre à un Gestionnaire de scolarité de filtrer la liste des étudiants de son UFR par année académique et par filière. |

> Décision de cadrage 2026-08-14 : FR-REF-04/05 comblent un manque identifié à l'usage — la Scolarité provisionne des comptes enseignants ponctuellement, pas seulement par import en masse (FR-REF-01). Les deux mécanismes restent conformes à INT-02 (aucune auto-inscription) puisque c'est toujours la Scolarité qui initie la création du compte.
>
> Décision de cadrage 2026-08-27 : FR-REF-06→11 découlent du passage au multi-UFR. Le terme "département" employé par le porteur de projet pour FR-REF-11 désigne le champ `filiere` déjà existant (ex. "Département d'Informatique" au sein de l'UFR-SEA) — aucune nouvelle entité hiérarchique n'est introduite entre UFR et filière.
>
> Décision de cadrage 2026-08-27 (retours après premier essai utilisateur) :
> - FR-REF-06 est révisée (voir ci-dessus) : l'affectation Enseignant↔UFR ne bloque plus jamais, elle se constate automatiquement.
> - FR-REF-12 : un Groupe porte sa propre `anneeAcademique` (année EN COURS de ce groupe précis, ex. "L2 INFO - Groupe A (2026-2027)") — distincte d'`Etudiant.anneeAcademique` (année d'INSCRIPTION, immuable, FR-REF-09). Une promotion (L1→L2 d'une année sur l'autre) se fait en créant un nouveau Groupe pour la nouvelle année/niveau puis en y déplaçant les étudiants (FR-REF-15), jamais en modifiant l'ancien Groupe sur place.
> - FR-REF-13 : une UE porte un `niveau` (L1...M2), affiché à côté de son intitulé — indépendant de l'année académique.
> - FR-REF-14 : l'écran de consultation des étudiants (FR-REF-11) N'AFFICHE AUCUN résultat tant que l'année académique ET la filière n'ont pas toutes les deux été renseignées par le Gestionnaire — l'affichage est conditionné à la fourniture des deux filtres, jamais une liste complète par défaut.
> - FR-REF-15 : affecter un étudiant à un nouveau Groupe (FR-REF-01) DOIT synchroniser son `niveau`/`filiere` sur ceux du Groupe de destination — c'est le mécanisme de promotion d'année (FR-REF-12).
> - FR-ADMIN-06 : l'Admin DOIT pouvoir consulter, pour une UFR choisie, le détail de son référentiel (groupes, salles, cours, étudiants) et de son planning — pas seulement des compteurs agrégés (FR-ADMIN-03) ni le journal d'audit seul.

### 2.3 Construction de l'emploi du temps

| ID | Exigence |
|---|---|
| FR-EDT-01 | Le Système DOIT permettre au Gestionnaire de scolarité de créer un créneau (récurrent hebdomadaire ou ponctuel) avec au minimum : UE, enseignant, groupe, salle, jour, heure de début, heure de fin. |
| FR-EDT-02 | Le Système DOIT permettre au Gestionnaire de scolarité de modifier un créneau existant, à condition de saisir un motif. |
| FR-EDT-03 | Le Système DOIT permettre au Gestionnaire de scolarité d'annuler un créneau, à condition de saisir un motif. |
| FR-EDT-04 | Le Système DOIT permettre à un Étudiant de consulter l'emploi du temps de son propre groupe. |
| FR-EDT-05 | Le Système DOIT permettre à un Enseignant de consulter son propre planning. |
| FR-EDT-06 | Un Étudiant NE DOIT PAS pouvoir consulter ou modifier l'emploi du temps d'un groupe autre que le sien. |

### 2.4 Moteur de détection de conflits

| ID | Exigence |
|---|---|
| FR-CONF-01 | Le Système DOIT détecter, à la création ou modification d'un créneau, tout conflit de salle (même salle, plages horaires chevauchantes, y compris partiellement). |
| FR-CONF-02 | Le Système DOIT détecter tout conflit d'enseignant (même enseignant sur deux créneaux chevauchants). |
| FR-CONF-03 | Le Système DOIT détecter tout conflit de groupe (même groupe sur deux créneaux chevauchants). |
| FR-CONF-04 | Le Système DOIT détecter tout conflit de capacité (effectif du groupe > capacité de la salle). |
| FR-CONF-05 | Le Système DOIT catégoriser chaque conflit détecté par gravité : **bloquant** ou **avertissement**. |
| FR-CONF-06 | Le Système DOIT afficher le(s) conflit(s) détecté(s) au Gestionnaire de scolarité avant l'enregistrement définitif du créneau. |
| FR-CONF-07 | Le Système DOIT permettre au Gestionnaire de scolarité d'enregistrer un créneau malgré un conflit détecté (bloquant ou avertissement), à condition de saisir un motif de dérogation. |
| FR-CONF-08 | Le Système DOIT tracer dans le journal d'audit toute dérogation à un conflit, avec auteur, date et motif. |

### 2.5 Notifications

| ID | Exigence |
|---|---|
| FR-NOTIF-01 | Le Système DOIT notifier, en moins d'une minute en conditions de réseau normal, tout Étudiant et Enseignant concerné par la création, la modification ou l'annulation d'un créneau qui les affecte. |
| FR-NOTIF-02 | Le Système DOIT permettre à l'utilisateur de consulter l'historique de ses notifications reçues. |
| FR-NOTIF-03 | Le Système DOIT envoyer une notification par canal de secours (SMS et/ou e-mail) pour les changements critiques (annulation, changement de salle le jour même). |
| FR-NOTIF-04 | Le Système NE DOIT PAS envoyer de SMS pour une notification non critique. |

### 2.6 Mode hors-ligne et synchronisation

| ID | Exigence |
|---|---|
| FR-OFF-01 | Le Système DOIT mettre en cache localement le dernier emploi du temps connu de l'utilisateur. |
| FR-OFF-02 | Le Système DOIT afficher explicitement la date et l'heure de la dernière synchronisation réussie lorsqu'il fonctionne hors-ligne. |
| FR-OFF-03 | Le Système DOIT mettre en file d'attente toute action effectuée hors-ligne et l'appliquer automatiquement au retour de connexion. |

### 2.7 Signalement enseignant

| ID | Exigence |
|---|---|
| FR-SIG-01 | Le Système DOIT permettre à un Enseignant de signaler une absence ou de demander un report/permutation de créneau. |
| FR-SIG-02 | Toute demande enseignant DOIT être validée par le Gestionnaire de scolarité avant application effective à l'emploi du temps publié. |
| FR-SIG-03 | Le Système DOIT permettre à l'Enseignant de consulter le statut de sa demande (en attente / validée / refusée). |

### 2.8 Audit et tableau de bord

| ID | Exigence |
|---|---|
| FR-AUD-01 | Le Système DOIT historiser chaque création, modification et annulation de créneau avec : auteur, date/heure, action, motif. |
| FR-AUD-02 | Le Système DOIT permettre au Gestionnaire de scolarité de consulter et d'exporter le journal d'audit. |
| FR-AUD-03 | Une entrée du journal d'audit NE DOIT PAS pouvoir être modifiée ou supprimée après sa création. |
| FR-DASH-01 | Le Système DOIT afficher au Gestionnaire de scolarité : le taux d'occupation des salles, le nombre de conflits détectés/résolus, le nombre de cours annulés sur une période donnée. |

## 3. Règles métier

| ID | Règle |
|---|---|
| RM-01 | Un créneau est défini par (salle, jour, heure de début, heure de fin). Deux créneaux dans la même salle sont en conflit si leurs plages horaires se chevauchent, même partiellement. |
| RM-02 | Un conflit de capacité est déclaré si effectif(groupe) > capacité(salle). |
| RM-03 | Un compte utilisateur a exactement un rôle parmi {Étudiant, Enseignant, Gestionnaire de scolarité, Admin} `[V2]`. |
| RM-04 | Une demande enseignant a exactement 3 états possibles : en attente, validée, refusée. |
| RM-05 | Un Gestionnaire de scolarité peut créer/modifier un créneau ou une salle uniquement pour l'UFR à laquelle il est rattaché ; jamais pour une autre UFR `[V2, remplace la version MVP à une seule UFR]`. |
| RM-06 `[V2]` | Un Étudiant est rattaché à exactement une UFR à la fois. Un changement d'UFR pour un Étudiant déjà inscrit ne peut être réalisé que par l'Admin (FR-ADMIN-05). |
| RM-07 `[V2]` | Un compte Gestionnaire de scolarité est toujours rattaché à exactement une UFR ; un compte Admin n'est rattaché à aucune UFR. |
| RM-08 `[V2, révisé 2026-08-27]` | Un Enseignant peut être rattaché à plusieurs UFR simultanément ; l'affectation est enregistrée automatiquement dès qu'il intervient dans une UFR, jamais bloquante (FR-REF-06). |

## 4. Contraintes non-fonctionnelles

| ID | Exigence | Justification |
|---|---|---|
| NFR-PERF-01 | Le Système DOIT supporter au moins 5 000 utilisateurs simultanés avec un temps de réponse p95 < 2 s sur les opérations de lecture. | Décision de cadrage 2026-08-11, à réviser après le pilote avec des données réelles d'usage. |
| NFR-DISPO-01 | Le Système DOIT rester consultable en lecture seule sans connexion réseau, à partir des données de la dernière synchronisation réussie. | Coupures réseau/électriques résiduelles documentées (cahier des charges §1.4). |
| NFR-DATA-01 | Le Système DOIT charger l'emploi du temps en moins de 3 secondes sur un réseau 3G, sur un navigateur Android d'entrée de gamme. | Coût réel de la donnée pour l'étudiant moyen, parc de terminaux dominé par l'Android économique. |
| NFR-SEC-01 | Le Système DOIT chiffrer toutes les communications en transit (HTTPS). | Standard attendu pour un système académique institutionnel. |
| NFR-SEC-02 | Un Étudiant NE DOIT PAS avoir de droit d'écriture sur une quelconque donnée d'emploi du temps. | RBAC, cahier des charges §4.6. |
| NFR-LEGAL-01 | Le Système DOIT informer les personnes concernées de la finalité du traitement de leurs données personnelles. | Loi n°001-2021/AN portant protection des données personnelles. |

## 5. Cas d'erreur

| ID | Scénario | Comportement attendu |
|---|---|---|
| ERR-01 | La base de données est inaccessible au moment d'une lecture. | Le Système DOIT servir la dernière version en cache avec l'indicateur de fraîcheur visible (FR-OFF-02), plutôt qu'une erreur bloquante. |
| ERR-02 | Un import de référentiel contient une ligne invalide (champ obligatoire manquant, doublon). | Le Système DOIT rejeter uniquement cette ligne et produire un rapport d'anomalies, sans bloquer l'import des lignes valides. |
| ERR-03 | Une notification push échoue (terminal incompatible, PWA non installée). | Le Système DOIT basculer sur le canal de secours (SMS/e-mail) uniquement pour les changements critiques (FR-NOTIF-03). |
| ERR-04 | Deux modifications concurrentes sont soumises sur le même créneau au même instant. | Le Système DOIT appliquer la première validée et signaler un conflit à la seconde, sans écraser silencieusement les données. |
| ERR-05 `[V2]` | Un import de référentiel contient un INE déjà présent dans le référentiel (même UFR ou UFR différente). | Le Système DOIT rejeter la ligne comme doublon (cf. FR-REF-08) et l'indiquer dans le rapport d'anomalies, sans créer de second Étudiant ni le rattacher à une seconde UFR. |
| ERR-06 `[V2]` | Un Gestionnaire de scolarité tente de rattacher à son UFR un Étudiant déjà inscrit dans une autre UFR (via affectation à un groupe). | Le Système DOIT rejeter l'opération avec un message explicite ; seul l'Admin peut réaliser ce transfert (FR-ADMIN-05). |

## 6. Test de validité (auto-vérification)

Chaque exigence ci-dessus est : **validable** (rattachée à un problème du PRD), **testable** (peut devenir un test unitaire/intégration), **contestable** (un chiffre ou un DOIT/NE DOIT PAS précis, pas un adjectif vague). Aucune exigence ne mentionne de technologie (SQL, NestJS, React) — ce choix appartient au document d'architecture.

---

*Document d'ingénierie — Étape 2/5. Prochaine étape : Contrat Système & Invariants (`03_Contrat_Invariants_Campus_Manager.md`).*
