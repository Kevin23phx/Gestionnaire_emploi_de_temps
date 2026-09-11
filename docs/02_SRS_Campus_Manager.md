# SRS — Campus Manager (V3, programme public)

**Étape 2 de la chaîne méthodologique** — répond à : *que doit garantir le système, exactement, sans dire comment ?*
Vocabulaire normatif RFC 2119 : **DOIT** (obligation absolue) · **NE DOIT PAS** (interdiction absolue) · **DEVRAIT** (forte recommandation) · **PEUT** (optionnel).

Périmètre : **V3 programme public**, 5 UFR (SH, SDS, SVT, SEA, LAC — cf. `01_PRD_Campus_Manager.md`, note de cadrage 2026-08-27), salles communes/louées rattachées à la DEP mais sans arbitrage inter-UFR automatisé, aucun acteur DSI. Deux comptes seulement (**Gestionnaire de scolarité d'UFR**, **Admin**) et un **Visiteur public** non authentifié. Les exigences héritées du MVP (2026-08-11) et de la V2 multi-UFR (2026-08-27) restent valables sauf mention contraire ; les changements de la V3 sont marqués `[V3]`, et les exigences retirées sont **barrées et annotées** plutôt que supprimées, pour que la traçabilité des décisions reste lisible.

> **`[V4]` Note de cadrage (2026-09-09) — le modèle temporel change.** Le programme de l'UJKZ est publié **semaine par semaine** et son contenu varie d'une semaine à l'autre (cf. `01_PRD`, note V4). Une séance porte désormais une **date réelle** ; la récurrence hebdomadaire disparaît. Sont retirées avec elle : **FR-REF-16/17** (période académique), **FR-EDT-07/08** (annulation d'une occurrence datée — un créneau EST une occurrence), **INV-14**, **INT-11** et **ERR-09**. **RM-01 change de portée** : deux créneaux ne sont en conflit que s'ils tombent le **même jour**, non plus le même jour de semaine — un cours du lundi 14 et un cours du lundi 21 ne se gênent pas. **RM-10 est retirée** : il n'existe plus deux natures d'annulation.

> **`[V3.2]` Note de cadrage (2026-09-07).** Le périmètre passe de **5 UFR à 12 établissements** (5 UFR, 6 instituts, 1 école doctorale) et **53 départements**, sur réception du référentiel officiel de l'UJKZ (cf. `01_PRD`, note V3.2). Le terme **« UFR » désigne désormais un établissement quel qu'en soit le type** dans tout ce document : le renommer partout aurait dispersé la révision sans rien clarifier, alors que le cloisonnement INT-07 et le champ `ufrId` restent identiques. En revanche, **toute chaîne lue par un utilisateur dit « établissement »**. FR-REF-20 est complétée : la liste proposée provient du référentiel officiel des départements, non plus des groupes existants.

> **`[V3.1]` Note de cadrage (2026-09-07, même journée).** Le **référentiel nominatif des étudiants est supprimé** (cf. `01_PRD`, note V3.1) : l'effectif d'un groupe devient un **nombre saisi** par le Gestionnaire, et non plus le résultat d'un comptage. Sont retirées avec lui les exigences FR-REF-07 à FR-REF-11, FR-REF-14, FR-REF-15, FR-ADMIN-05, RM-06, INV-09, INT-08, ERR-05 et ERR-06 — toutes barrées ci-dessous, aucune supprimée silencieusement. **RM-02 (conflit de capacité) est inchangée dans son énoncé** mais change de nature : elle comparait deux valeurs vérifiables, elle compare désormais une capacité de salle à une déclaration. Le Système ne peut plus détecter qu'un effectif est faux ; il peut seulement signaler qu'il est absent.

> **`[V3]` Note de cadrage (2026-09-07).** À la suite de la présentation aux responsables UJKZ (cf. `01_PRD` §note de cadrage 2026-09-07), trois décisions structurelles s'appliquent à tout ce document :
> 1. **Les rôles Étudiant et Enseignant sont retirés du système d'authentification.** Ils demeurent des **entités du référentiel** (un créneau porte toujours un Enseignant ; un Groupe a toujours un effectif d'Étudiants qui alimente le conflit de capacité RM-02), mais plus aucun compte ne leur correspond.
> 2. **Le programme de toutes les UFR devient public**, consultable sans authentification, l'étudiant venant y chercher le sien (§2.1ter).
> 3. **Le circuit de demandes enseignant est retiré** (§2.7) : le canal est le téléphone, et la correction directe du programme par le Gestionnaire — qui reste soumise à motif obligatoire et tracée à l'audit — tient lieu à la fois d'application et de notification.

---

## 1. Acteurs

| Acteur | Type | Rôle |
|---|---|---|
| **Visiteur public** `[V3]` | Humain, **non authentifié** | Lecture seule sur le programme de **n'importe quel** groupe de **n'importe quelle** UFR, sans compte. Peut conserver un programme en favori sur son propre appareil et l'abonner à son agenda personnel. C'est le rôle sous lequel l'étudiant, l'enseignant, le parent ou l'agent consultent désormais l'emploi du temps. |
| ~~Étudiant~~ | ~~Humain~~ | ~~Lecture seule sur l'emploi du temps de son propre groupe~~ — **`[V3]` retiré en tant qu'acteur authentifié** (remplacé par le Visiteur public). L'Étudiant reste une **entité du référentiel** rattachée à exactement une UFR et à un Groupe : son existence alimente l'effectif du groupe (RM-02) et la promotion de cohorte (FR-REF-15), mais il n'a plus de compte. |
| ~~Enseignant~~ | ~~Humain~~ | ~~Lecture sur son propre planning, écriture limitée (signalements soumis à validation)~~ — **`[V3]` retiré en tant qu'acteur authentifié**. L'Enseignant reste une **entité du référentiel**, obligatoirement rattachée à chaque créneau et affichée sur le programme public, et peut toujours être rattachée à plusieurs UFR (RM-08). Il signale une indisponibilité **hors système** (téléphone) au Gestionnaire. |
| Gestionnaire de scolarité d'UFR *(anciennement "Scolarité d'UFR")* | Humain | Contrôle total sur le référentiel et l'emploi du temps de sa propre UFR uniquement |
| Admin `[V2]` | Humain | Crée les UFR et les comptes Gestionnaire associés ; supervise (lecture seule) le référentiel, le planning et l'audit de toutes les UFR ; n'a aucun droit d'écriture sur le référentiel/planning d'une UFR |
| Système (moteur de conflits, notification, synchronisation) | Non-humain | Applique automatiquement les règles ci-dessous, sans intervention humaine |

## 2. Exigences fonctionnelles

### 2.1 Authentification et comptes

| ID | Exigence |
|---|---|
| FR-AUTH-01 `[V3, révisé]` | Le Système DOIT permettre à un **Gestionnaire de scolarité** ou à un **Admin** de s'authentifier par identifiant et mot de passe. *(Version V2 : « à un Étudiant, un Enseignant, un Gestionnaire de scolarité ou un Admin » — les deux premiers n'ont plus de compte.)* |
| FR-AUTH-02 | Le Système DOIT déterminer automatiquement le rôle de l'utilisateur authentifié à partir de son compte, sans que l'utilisateur ait à le sélectionner. |
| FR-AUTH-03 `[V3, révisé]` | Le Système DOIT permettre à un utilisateur disposant d'un compte pré-provisionné d'activer ce compte en définissant un mot de passe lors de sa première connexion. **Ne concerne plus que les comptes Gestionnaire créés par l'Admin (FR-ADMIN-02)**, l'activation des comptes Étudiant/Enseignant ayant disparu avec ces comptes. |
| FR-AUTH-04 `[V3, révisé]` | Le Système NE DOIT PAS permettre la création d'un compte en libre-service. **Les seuls comptes existants sont les comptes Gestionnaire et Admin, provisionnés exclusivement par l'Admin (cf. FR-ADMIN-02).** *(La clause V2 sur le provisionnement des comptes Étudiant/Enseignant par le Gestionnaire est caduque.)* |
| FR-AUTH-05 `[V3]` | Le Système NE DOIT PAS exiger d'authentification, ni d'identification d'aucune forme, pour la consultation d'un programme (§2.1ter). Aucun compte, aucune inscription et aucune donnée personnelle du visiteur NE DOIVENT être requis pour accéder à un emploi du temps. |
| FR-AUTH-06 `[V3]` | La surface publique (§2.1ter) DOIT être strictement en **lecture seule** : aucune requête non authentifiée NE DOIT pouvoir créer, modifier ou supprimer une quelconque donnée du système. |

### 2.1bis Administration multi-UFR `[V2]`

| ID | Exigence |
|---|---|
| FR-ADMIN-01 | Le Système DOIT permettre à l'Admin de créer une nouvelle UFR (nom, sigle). |
| FR-ADMIN-02 | Le Système DOIT permettre à l'Admin de créer, pour une UFR donnée, un compte Gestionnaire de scolarité pré-provisionné, avec un identifiant de la forme `scolarite.<sigle-ufr>` (sigle en minuscules, ex. `scolarite.svt`) — ce compte suit le même mécanisme d'activation que FR-AUTH-03. |
| FR-ADMIN-03 | Le Système DOIT donner à l'Admin un accès en lecture seule au référentiel, au planning, aux conflits et au journal d'audit de **toutes** les UFR. |
| FR-ADMIN-04 | Le Système NE DOIT PAS permettre à l'Admin de créer, modifier ou annuler directement un créneau, une salle, un cours ou une affectation d'étudiant dans une UFR — ces actions restent la responsabilité exclusive du Gestionnaire de l'UFR concernée. |
| ~~FR-ADMIN-05~~ | ~~Le Système DOIT permettre uniquement à l'Admin de transférer un Étudiant déjà inscrit d'une UFR vers une autre.~~ **`[V3.1]` Retirée**, faute d'objet : il n'existe plus d'Étudiant en base à transférer. C'était une décision explicite de la V2, elle est ici annulée en connaissance de cause. |

### 2.1ter Consultation publique du programme `[V3]`

Le cœur de la V3. Remplace, pour l'étudiant, tout ce que couvraient FR-EDT-04/06 et la section Notifications.

| ID | Exigence |
|---|---|
| FR-PUB-01 | Le Système DOIT rendre le programme de **toutes** les UFR consultable publiquement, sans authentification. |
| FR-PUB-02 | Le Système DOIT permettre au Visiteur public de retrouver un programme par une **sélection en cascade** : UFR, puis département, puis niveau, puis — s'il subsiste plusieurs groupes correspondants — le groupe. Chaque étape NE DOIT proposer que les valeurs effectivement présentes dans le référentiel compte tenu des choix précédents. |
| FR-PUB-03 | Le Système DOIT afficher, pour le programme retrouvé, au minimum : l'intitulé de l'UE, l'enseignant, la salle et son bâtiment, le jour, l'heure de début et l'heure de fin, ainsi que le **statut** de chaque séance (normale, modifiée, annulée) et son motif le cas échéant. |
| FR-PUB-04 | Le Système DOIT permettre au Visiteur public d'enregistrer un programme en **favori sur son propre appareil**, et de le retrouver ensuite sans refaire la sélection FR-PUB-02. Le favori NE DOIT PAS être stocké côté serveur ni nécessiter la création d'un compte. |
| FR-PUB-05 | Le Système DOIT exposer, pour chaque groupe, une **adresse d'abonnement calendrier permanente et stable** permettant au Visiteur public de rattacher le programme à son agenda personnel (téléphone, Google Agenda, Outlook) une seule fois. |
| FR-PUB-06 | Un agenda abonné via FR-PUB-05 DOIT recevoir **automatiquement** toute évolution ultérieure du programme — ajout, modification, annulation — sans nouvelle action du visiteur. Un abonnement établi une fois NE DOIT JAMAIS avoir à être refait à la suite d'un changement de programme. |
| FR-PUB-07 | Une séance annulée ou modifiée DOIT **rester visible** dans l'agenda abonné, explicitement signalée comme telle et accompagnée de son motif — elle NE DOIT PAS disparaître silencieusement, ce qui priverait le visiteur de l'information même qu'on cherche à lui transmettre. |
| FR-PUB-08 | Le Système DOIT permettre au Visiteur public d'activer, **optionnellement et sans compte**, une alerte sur un programme mis en favori, afin d'être averti immédiatement d'une annulation ou d'une modification (cf. FR-NOTIF-01). Le refus ou l'indisponibilité de cette alerte NE DOIT dégrader aucune autre fonctionnalité. |
| FR-PUB-09 | Le programme consulté publiquement DOIT rester consultable **hors connexion** dans son dernier état connu, au même titre que FR-OFF-01. |

> Décision de cadrage 2026-09-07 : FR-PUB-02 impose la cascade **UFR → département → niveau → groupe** et non le couple « UFR + niveau » initialement évoqué par les responsables. Motif : un programme est attaché à un **Groupe**, et à l'échelle d'une UFR de l'UJKZ un couple UFR+niveau (ex. « UFR-SEA, L1 ») désigne des dizaines de groupes répartis sur plusieurs départements — il ne désigne donc pas un programme. Le département est l'échelon manquant qui rend la sélection déterministe.

### 2.2 Référentiel académique

| ID | Exigence |
|---|---|
| FR-REF-01 | Le Système DOIT permettre à un Gestionnaire de scolarité d'importer les référentiels (départements, niveaux, groupes, UE, salles, enseignants) de **sa propre UFR** via un fichier structuré (Excel/CSV). |
| FR-REF-02 | Le Système DOIT permettre à un Gestionnaire de scolarité de créer/modifier une salle de sa propre UFR avec au minimum : nom, capacité d'accueil, structure gestionnaire, type d'usage. |
| FR-REF-03 | Chaque salle DOIT être rattachée à exactement une structure gestionnaire : une UFR (parmi les 5), ou la DEP pour les salles communes/louées `[V2]` (pour le MVP à une seule UFR, ce champ valait toujours l'UFR pilote). |
| FR-REF-04 `[V3, révisé]` | Le Système DOIT permettre à un Gestionnaire de scolarité d'**enregistrer un enseignant dans le référentiel** (nom, prénom) directement depuis l'écran de création de créneau, lorsque l'enseignant n'y figure pas encore. *(V2 : « provisionner un compte enseignant » — c'est désormais une fiche de référentiel, pas un compte.)* |
| ~~FR-REF-05~~ | ~~Ce compte enseignant provisionné via FR-REF-04 NE DOIT PAS être créé avec un mot de passe saisi par le Gestionnaire ; il reste "non activé" jusqu'à ce que l'enseignant l'active lui-même.~~ **`[V3]` Retirée** — sans objet, un enseignant n'a plus de compte à activer. |
| FR-REF-06 `[V2, révisé 2026-08-27]` | Le Système NE DOIT JAMAIS empêcher un Gestionnaire d'affecter un Enseignant à un créneau au motif qu'il n'est pas encore rattaché à son UFR — tout Enseignant capable de dispenser un cours DOIT pouvoir intervenir dans n'importe quelle UFR. L'affectation (table EnseignantUfr) DOIT néanmoins être enregistrée automatiquement à la première utilisation d'un Enseignant dans une UFR donnée, pour que son planning agrégé (toutes UFR confondues) reste exact — c'est une trace, jamais une porte d'entrée bloquante. |
| ~~FR-REF-07~~ `[V2]` | ~~Le Système DOIT rattacher chaque Étudiant à exactement une UFR.~~ **`[V3.1]` Retirée** avec le référentiel nominatif des étudiants. |
| ~~FR-REF-08~~ `[V2]` | ~~Le Système NE DOIT PAS permettre d'importer deux fois le même Étudiant (même INE).~~ **`[V3.1]` Retirée** — plus d'import, donc plus de doublon possible. |
| ~~FR-REF-09~~ `[V2]` | ~~Le Système DOIT enregistrer, pour chaque Étudiant importé, l'année académique de son inscription.~~ **`[V3.1]` Retirée.** L'année académique reste portée par le **Groupe** (FR-REF-12), qui elle sert toujours. |
| ~~FR-REF-10~~ `[V2]` | ~~Le Système DOIT fournir un fichier modèle (canevas .xlsx) pour l'import d'étudiants.~~ **`[V3.1]` Retirée** avec l'import. |
| ~~FR-REF-11~~ `[V2]` | ~~Le Système DOIT permettre de filtrer la liste des étudiants par année académique et par filière.~~ **`[V3.1]` Retirée** — il n'y a plus de liste d'étudiants. Le filtrage des **groupes** par département/niveau/année, lui, existe (FR-FILT-03). |
| FR-REF-18 `[V3.1]` | Le Système DOIT permettre à un Gestionnaire de scolarité de saisir le **nombre d'étudiants** d'un groupe, à sa création comme à tout moment ensuite. Cette valeur est la seule information d'effectif que le Système détient, et elle alimente exclusivement la détection de conflit de capacité (RM-02). |
| FR-REF-19 `[V3.1]` | Le Système NE DOIT PAS accepter un effectif négatif ou non entier — une telle valeur désactiverait silencieusement la détection de conflit de capacité, seule chose que cet effectif serve à alimenter. |
| FR-REF-20 `[V3.1, complétée V3.2]` | Le Système DOIT présenter le département, le niveau et l'année académique d'un groupe sous forme de **listes de valeurs à sélectionner**, et non de champs de saisie libre. Motif : trois orthographes d'un même département (« Informatique », « informatique », « INFO ») produiraient trois entrées distinctes dans la cascade de recherche publique (FR-PUB-02), face auxquelles l'étudiant ne saurait pas laquelle choisir. **`[V3.2]`** Les départements proposés DOIVENT provenir du **référentiel officiel des départements** de l'établissement (FR-REF-22), et non des groupes déjà saisis. |
| FR-REF-21 `[V3.1, révisée V3.2]` | La liste des départements DOIT néanmoins permettre d'en déclarer un nouveau, **et cette déclaration DOIT enrichir le référentiel des départements** de l'établissement, pour être proposée aux créations suivantes. Une liste qui ne s'enrichit pas condamne le Gestionnaire à attendre une mise à jour applicative dès qu'un département s'ouvre. |
| FR-REF-22 `[V3.2, précisée V3.3, unifiée V5]` | **`[V5]`** « Filière » et « département » ne sont plus deux mots pour une même chose : le champ `Groupe.filiere` a été renommé `Groupe.departement` le 2026-09-11, pour que le vocabulaire cesse de diverger entre l'écran (qui disait déjà « département » depuis la V3.3) et le code. « Médecine et Spécialités médicales », « Pharmacie » et « Medecine » sont trois départements de l'UFR/SDS, au même rang. Il n'existe **aucun niveau hiérarchique** entre l'établissement et le département. Le Système DOIT tenir un **référentiel des départements** rattachés à chaque établissement, alimenté par le référentiel officiel de l'UJKZ (53 départements sur 12 établissements). Deux départements d'un même établissement NE DOIVENT PAS pouvoir porter le même libellé, à la casse près. |
| FR-REF-26 `[V3.3]` | Le Système DOIT permettre de rattacher une unité d'enseignement à **un ou plusieurs départements** de son établissement, et DOIT afficher ces départements partout où le cours est consulté ou recherché. Le rattachement multiple est la seule modélisation qui rende compte d'un cours mutualisé (tronc commun, UE transversale) : avec un rattachement unique, la même UE devrait être ressaisie autant de fois qu'il y a de départements concernés, et la question « quels départements suivent ce cours ? » resterait sans réponse. |
| FR-REF-27 `[V3.3]` | Un cours sans département DOIT rester enregistrable — son rattachement n'est pas toujours arbitré au moment de la saisie — mais le Système DOIT signaler qu'il sera introuvable par une recherche par département, plutôt que de laisser la conséquence se découvrir à l'usage. |
| FR-REF-28 `[V3.3]` | Le Système DOIT afficher l'**année académique** d'un groupe partout où celui-ci est présenté (référentiel, liste des programmes, feuille de programme, favoris). Un même nom de groupe existe d'une année sur l'autre : sans l'année, rien ne distingue la promotion en cours de la précédente. |
| FR-REF-25 `[V3.2]` | Le Système NE DOIT JAMAIS normaliser, fusionner ni corriger de lui-même un intitulé de département issu du référentiel officiel. Deux intitulés proches ne sont pas présumés redondants : « Philosophie -Psychologie » et « Pshychologie » (UFR/SH), « Médecine et Spécialités médicales » et « Medecine » (UFR/SDS) désignent des départements distincts aux contenus différents, confirmé par le responsable de la scolarité le 2026-09-07. Seule une mise à jour du document officiel peut faire évoluer ces libellés. |
| FR-REF-23 `[V3.2]` | Le Système DOIT distinguer trois **types d'établissement** — UFR, institut, école doctorale — et en dériver le sigle affiché (« UFR/SH » pour une UFR, « IBAM » pour un institut). Le préfixe « UFR/ » NE DOIT PAS être saisi ni stocké : dupliquer une règle dérivable ouvre la porte à une incohérence entre les deux (un institut nommé « UFR/IBAM »). |
| FR-REF-24 `[V3.2]` | Le Système DOIT désigner un établissement par le mot « **établissement** » dans toute chaîne présentée à un utilisateur, et jamais par « UFR », qui ne couvre que 5 des 12 établissements de l'UJKZ. |
| ~~FR-REF-16~~ `[V3]` | ~~Le Système DOIT permettre de définir les dates de début et de fin de la période académique.~~ **`[V4]` Retirée.** Elle n'existait que pour borner la récurrence ; celle-ci ayant disparu, elle n'a plus rien à borner. Le porteur de projet a par ailleurs signalé que ces dates « varient souvent » et ne pouvaient être tenues à jour de façon fiable pour 12 établissements — une donnée que le Système exige mais que personne ne peut garantir est pire qu'une donnée absente. |
| ~~FR-REF-17~~ `[V3]` | ~~Chaque UFR DOIT pouvoir déclarer un calendrier distinct.~~ **`[V4]` Retirée** avec FR-REF-16. |
| FR-EDT-10 `[V4]` | Le Système DOIT rattacher chaque séance à une **date réelle**, et NE DOIT PAS proposer de mécanisme de répétition automatique. Le programme est composé et publié semaine par semaine : ce qui n'a pas été saisi pour une semaine n'existe pas cette semaine-là. |
| FR-EDT-11 `[V4]` | Le Système NE DOIT PAS accepter une séance datée un **dimanche**. Il n'y a pas cours ce jour-là à l'UJKZ ; l'accepter rangerait la séance dans un jour que la grille n'affiche pas, et le Gestionnaire croirait avoir programmé un cours introuvable. |
| FR-EDT-12 `[V4]` | Le Système DOIT distinguer, pour une semaine donnée, « programme non encore publié » de « aucun cours » — le programme sortant en fin de semaine précédente, une grille vide est le cas normal et ne DOIT pas se présenter comme une anomalie. |

> Décision de cadrage 2026-08-14 : FR-REF-04/05 comblent un manque identifié à l'usage — la Scolarité provisionne des comptes enseignants ponctuellement, pas seulement par import en masse (FR-REF-01). Les deux mécanismes restent conformes à INT-02 (aucune auto-inscription) puisque c'est toujours la Scolarité qui initie la création du compte.
>
> Décision de cadrage 2026-08-27 : FR-REF-06→11 découlent du passage au multi-UFR. Le terme "département" employé par le porteur de projet pour FR-REF-11 désignait le champ `filiere` déjà existant (ex. "Département d'Informatique" au sein de l'UFR-SEA) — aucune nouvelle entité hiérarchique n'était introduite entre UFR et filière. **`[V5]`** Ce double vocabulaire (« département » parlé, `filiere` codé) a fini par entretenir la confusion qu'il visait à éviter : le champ a été renommé `departement` le 2026-09-11 (cf. FR-REF-22).
>
> Décision de cadrage 2026-08-27 (retours après premier essai utilisateur) :
> - FR-REF-06 est révisée (voir ci-dessus) : l'affectation Enseignant↔UFR ne bloque plus jamais, elle se constate automatiquement.
> - FR-REF-12 : un Groupe porte sa propre `anneeAcademique` (année EN COURS de ce groupe précis, ex. "L2 INFO - Groupe A (2026-2027)") — distincte d'`Etudiant.anneeAcademique` (année d'INSCRIPTION, immuable, FR-REF-09). Une promotion (L1→L2 d'une année sur l'autre) se fait en créant un nouveau Groupe pour la nouvelle année/niveau puis en y déplaçant les étudiants (FR-REF-15), jamais en modifiant l'ancien Groupe sur place.
> - FR-REF-13 : une UE porte un `niveau` (L1...M2), affiché à côté de son intitulé — indépendant de l'année académique.
> - FR-REF-14 : l'écran de consultation des étudiants (FR-REF-11) N'AFFICHE AUCUN résultat tant que l'année académique ET le département n'ont pas tous les deux été renseignés par le Gestionnaire — l'affichage est conditionné à la fourniture des deux filtres, jamais une liste complète par défaut.
> - ~~FR-REF-15~~ : ~~affecter un étudiant à un nouveau Groupe DOIT synchroniser son niveau/filière sur ceux du Groupe de destination.~~ **`[V3.1]` Retirée** avec le référentiel nominatif. La promotion d'une cohorte se fait désormais en créant le Groupe de l'année suivante et en y saisissant son effectif.
> - ~~FR-REF-14~~ : ~~l'écran de consultation des étudiants n'affiche aucun résultat tant que l'année ET la filière ne sont pas renseignées.~~ **`[V3.1]` Retirée** avec l'écran.
> - FR-ADMIN-06 : l'Admin DOIT pouvoir consulter, pour une UFR choisie, le détail de son référentiel (groupes, salles, cours, étudiants) et de son planning — pas seulement des compteurs agrégés (FR-ADMIN-03) ni le journal d'audit seul.

### 2.3 Construction de l'emploi du temps

| ID | Exigence |
|---|---|
| FR-EDT-01 | Le Système DOIT permettre au Gestionnaire de scolarité de créer un créneau (récurrent hebdomadaire ou ponctuel) avec au minimum : UE, enseignant, groupe, salle, jour, heure de début, heure de fin. |
| FR-EDT-02 | Le Système DOIT permettre au Gestionnaire de scolarité de modifier un créneau existant, à condition de saisir un motif. |
| FR-EDT-03 | Le Système DOIT permettre au Gestionnaire de scolarité d'annuler un créneau, à condition de saisir un motif. |
| ~~FR-EDT-07~~ | ~~Le Système DOIT permettre d'annuler une séance à une date précise d'un créneau récurrent.~~ **`[V4]` Retirée**, sans objet : un créneau porte sa propre date, l'annuler (FR-EDT-03) n'annule que cette séance-là. |
| ~~FR-EDT-08~~ | ~~Le Système DOIT distinguer visuellement une séance annulée à une date précise d'un créneau annulé pour toute la période.~~ **`[V4]` Retirée** avec FR-EDT-07 : il n'existe plus qu'une seule sorte d'annulation. |
| ~~FR-EDT-04~~ | ~~Le Système DOIT permettre à un Étudiant de consulter l'emploi du temps de son propre groupe.~~ **`[V3]` Remplacée par FR-PUB-01/02** : la consultation ne dépend plus de l'appartenance d'un compte à un groupe. |
| ~~FR-EDT-05~~ | ~~Le Système DOIT permettre à un Enseignant de consulter son propre planning.~~ **`[V3]` Retirée** — plus de compte enseignant. L'enseignant consulte le programme public comme tout visiteur. |
| ~~FR-EDT-06~~ | ~~Un Étudiant NE DOIT PAS pouvoir consulter l'emploi du temps d'un groupe autre que le sien.~~ **`[V3]` Retirée, et volontairement inversée** : le cloisonnement en lecture n'a plus lieu d'être, tout programme étant public (FR-PUB-01). L'interdiction d'**écriture** demeure et est portée par FR-AUTH-06 et NFR-SEC-02. |
| FR-EDT-07 `[V3]` | Le Système DOIT permettre au Gestionnaire de scolarité d'annuler **une séance à une date précise** d'un créneau récurrent (ex. « le cours du mardi 15 septembre est annulé »), à condition de saisir un motif, **sans supprimer ni interrompre** les autres occurrences de ce créneau. |
| FR-EDT-08 `[V3]` | Le Système DOIT distinguer visuellement, sur toute grille d'emploi du temps, une séance annulée à une date précise (FR-EDT-07) d'un créneau annulé pour l'ensemble de la période — sans quoi l'annulation ponctuelle existerait en base sans être perceptible par l'utilisateur. |
| FR-EDT-09 `[V3]` | Toute grille d'emploi du temps, publique comme gestionnaire, DOIT être **rattachée à une semaine calendaire identifiée** (dates affichées) et permettre de naviguer d'une semaine à l'autre à l'intérieur de la période académique (FR-REF-16). |

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
| FR-NOTIF-01 `[V3, révisé]` | Le Système DOIT diffuser, en moins d'une minute en conditions de réseau normal, toute création, modification ou annulation de créneau vers le programme public correspondant, ainsi que vers l'alerte optionnelle des visiteurs l'ayant activée (FR-PUB-08). *(V2 : « notifier tout Étudiant et Enseignant concerné » — il n'y a plus de destinataire nominatif à notifier.)* |
| ~~FR-NOTIF-02~~ | ~~Le Système DOIT permettre à l'utilisateur de consulter l'historique de ses notifications reçues.~~ **`[V3]` Retirée côté consultation** — un historique par utilisateur suppose un compte. L'information reste accessible autrement : le statut et le motif de chaque séance sont portés par le programme lui-même (FR-PUB-03) et par l'agenda abonné (FR-PUB-07). |
| ~~FR-NOTIF-03~~ | ~~Le Système DOIT envoyer une notification par canal de secours (SMS et/ou e-mail) pour les changements critiques.~~ **`[V3]` Retirée** — le SMS suppose de détenir les coordonnées personnelles de chaque étudiant, ce qui est sans objet et disproportionné dès lors qu'aucun compte n'existe (cf. NFR-LEGAL-01). |
| ~~FR-NOTIF-04~~ | ~~Le Système NE DOIT PAS envoyer de SMS pour une notification non critique.~~ **`[V3]` Retirée** avec FR-NOTIF-03. |
| FR-NOTIF-05 `[V3]` | Le Système DOIT considérer l'agenda personnel abonné (FR-PUB-05/06) comme un canal **différé** : la fréquence de rafraîchissement y est décidée par le fournisseur d'agenda du visiteur et peut atteindre plusieurs heures. Le Système NE DOIT donc PAS s'appuyer sur ce seul canal pour satisfaire FR-NOTIF-01 ; l'alerte de FR-PUB-08 et la consultation directe du programme public en sont les canaux immédiats. |

### 2.6 Mode hors-ligne et synchronisation

| ID | Exigence |
|---|---|
| FR-OFF-01 | Le Système DOIT mettre en cache localement le dernier emploi du temps connu de l'utilisateur. |
| FR-OFF-02 | Le Système DOIT afficher explicitement la date et l'heure de la dernière synchronisation réussie lorsqu'il fonctionne hors-ligne. |
| FR-OFF-03 | Le Système DOIT mettre en file d'attente toute action effectuée hors-ligne et l'appliquer automatiquement au retour de connexion. |

### 2.7 ~~Signalement enseignant~~ — **section retirée `[V3]`**

> **Décision des responsables UJKZ, 2026-09-07** : « l'enseignant peut appeler pour ces genres de situation ; s'il y a signalement, le gestionnaire refait un autre agenda, histoire d'avertir les étudiants ». Le circuit de demande formalisé (FR-SIG-01/02/03, RM-04) est donc **retiré du périmètre** : le canal de signalement redevient le téléphone, hors système. L'application du changement est faite directement par le Gestionnaire au titre de FR-EDT-02, FR-EDT-03 ou FR-EDT-07 — donc toujours **avec motif obligatoire et trace d'audit** (FR-AUD-01) — et la diffusion aux étudiants est assurée par le programme public et l'agenda abonné (FR-PUB-06/07). Le niveau de traçabilité est ainsi préservé ; ce qui disparaît est l'étape de validation formelle, désormais implicite puisque c'est le Gestionnaire lui-même qui décide et applique.

| ID | Exigence |
|---|---|
| ~~FR-SIG-01~~ | ~~Le Système DOIT permettre à un Enseignant de signaler une absence ou de demander un report/permutation de créneau.~~ **Retirée `[V3]`.** |
| ~~FR-SIG-02~~ | ~~Toute demande enseignant DOIT être validée par le Gestionnaire de scolarité avant application effective à l'emploi du temps publié.~~ **Retirée `[V3]`.** |
| ~~FR-SIG-03~~ | ~~Le Système DOIT permettre à l'Enseignant de consulter le statut de sa demande.~~ **Retirée `[V3]`.** |

### 2.8 Audit et tableau de bord

| ID | Exigence |
|---|---|
| FR-AUD-01 | Le Système DOIT historiser chaque création, modification et annulation de créneau avec : auteur, date/heure, action, motif. |
| FR-AUD-02 | Le Système DOIT permettre au Gestionnaire de scolarité de consulter et d'exporter le journal d'audit. |
| FR-AUD-03 | Une entrée du journal d'audit NE DOIT PAS pouvoir être modifiée ou supprimée après sa création. |
| FR-AUD-04 `[V3]` | Le Système DOIT permettre au Gestionnaire de scolarité de **filtrer** le journal d'audit, au minimum par plage de dates, par auteur et par recherche textuelle sur l'action ou le motif. Un journal append-only croît sans limite ; sans filtre, FR-AUD-02 devient inexploitable dès le premier semestre. |
| FR-DASH-01 | Le Système DOIT afficher au Gestionnaire de scolarité : le taux d'occupation des salles, le nombre de conflits détectés/résolus, le nombre de cours annulés sur une période donnée. |

### 2.9 Recherche et filtrage `[V3]`

> **Décision des responsables UJKZ, 2026-09-07** : à l'échelle de l'UJKZ, un référentiel sans recherche ni tri « cause plus de problèmes qu'il n'en résout » — le Gestionnaire perd davantage de temps à retrouver une donnée qu'il n'en gagnait sur le papier. Ces exigences sont donc fonctionnelles, pas cosmétiques.

| ID | Exigence |
|---|---|
| FR-FILT-01 | Le Système DOIT offrir au Gestionnaire de scolarité une recherche et un filtrage sur les sections **Programmes**, **Groupes**, **Salles**, **Cours** et **Journal d'audit**. |
| FR-FILT-02 | Toute recherche textuelle DOIT être **insensible à la casse et aux accents** — « reseaux » DOIT trouver « Réseaux ». |
| FR-FILT-03 | Le Système DOIT permettre de filtrer les Programmes et les Groupes par département, par niveau et par année académique, et les Salles par bâtiment, type d'usage et capacité minimale. |
| FR-FILT-04 | Le Système DOIT permettre au Gestionnaire de **vérifier l'existence** d'une salle ou d'un cours **au moment même où il construit un créneau** — c'est-à-dire par une recherche directement dans les sélecteurs du formulaire de créneau, et non uniquement dans les écrans de référentiel. Lorsqu'aucun résultat ne correspond, le Système DOIT le dire explicitement plutôt que de présenter une liste vide. |
| FR-FILT-05 | L'état des filtres appliqués DOIT être reflété dans l'adresse de la page, afin qu'une vue filtrée puisse être rechargée ou transmise à un collègue sans être reconstruite à la main. |
| FR-FILT-06 | Le Système DOIT effectuer le filtrage **côté serveur** pour les collections susceptibles d'atteindre plusieurs milliers d'éléments (étudiants, journal d'audit, créneaux), afin de ne jamais faire transiter l'intégralité d'une collection vers le terminal du Gestionnaire (cf. NFR-DATA-01). |

## 3. Règles métier

| ID | Règle |
|---|---|
| RM-01 `[V4, portée révisée]` | Un créneau est défini par (salle, **date**, heure de début, heure de fin). Deux créneaux dans la même salle sont en conflit si leurs plages horaires se chevauchent, même partiellement, **et qu'ils tombent le même jour**. *(Avant la V4 : « jour de semaine » — tous les lundis étaient confondus, ce qui était juste sous un modèle récurrent et faux dès lors que chaque semaine a son propre programme.)* |
| RM-02 `[V3.1, portée révisée]` | Un conflit de capacité est déclaré si effectif(groupe) > capacité(salle). **L'énoncé est inchangé, sa fiabilité ne l'est pas** : `effectif` était un comptage vérifiable (nombre d'Étudiants rattachés), c'est désormais une valeur déclarée par le Gestionnaire. Le Système ne peut donc plus détecter qu'un effectif est faux — seulement qu'il vaut zéro, auquel cas aucun conflit de capacité ne sera jamais signalé pour ce groupe. |
| RM-03 `[V3, révisé]` | Un compte utilisateur a exactement un rôle parmi **{Gestionnaire de scolarité, Admin}**. *(V2 : {Étudiant, Enseignant, Gestionnaire de scolarité, Admin}.)* Un Visiteur public n'a pas de compte et n'est donc porteur d'aucun rôle. |
| ~~RM-04~~ | ~~Une demande enseignant a exactement 3 états possibles : en attente, validée, refusée.~~ **`[V3]` Retirée** avec le circuit de demandes (§2.7). |
| RM-05 | Un Gestionnaire de scolarité peut créer/modifier un créneau ou une salle uniquement pour l'UFR à laquelle il est rattaché ; jamais pour une autre UFR `[V2, remplace la version MVP à une seule UFR]`. |
| ~~RM-06~~ `[V2]` | ~~Un Étudiant est rattaché à exactement une UFR à la fois.~~ **`[V3.1]` Retirée** avec le référentiel nominatif des étudiants. |
| RM-07 `[V2]` | Un compte Gestionnaire de scolarité est toujours rattaché à exactement une UFR ; un compte Admin n'est rattaché à aucune UFR. |
| RM-08 `[V2, révisé 2026-08-27]` | Un Enseignant peut être rattaché à plusieurs UFR simultanément ; l'affectation est enregistrée automatiquement dès qu'il intervient dans une UFR, jamais bloquante (FR-REF-06). |
| RM-09 `[V3, précisée V3.2]` | Un programme est l'emploi du temps d'exactement **un Groupe**. Un Groupe est identifié par le quadruplet (établissement, département, niveau, nom) — c'est ce qui rend la cascade FR-PUB-02 déterministe, et ce qui interdit d'identifier un programme par le seul couple (UFR, niveau). |
| ~~RM-10~~ `[V3]` | ~~Une annulation porte soit sur une occurrence datée, soit sur le créneau entier.~~ **`[V4]` Retirée** : les deux natures ont fusionné. Conservée ici pour mémoire — | Une annulation porte soit sur **une occurrence datée** d'un créneau (FR-EDT-07), soit sur **le créneau entier** pour toute la période académique (FR-EDT-03). Ces deux annulations sont de nature différente et NE DOIVENT PAS être confondues : la première laisse le créneau actif, la seconde le retire du programme. |
| RM-11 `[V3]` | Une adresse d'abonnement calendrier (FR-PUB-05) est **stable pour la durée de vie du groupe** : elle ne change ni lorsque le programme est modifié, ni lorsqu'un créneau est ajouté ou supprimé — sans quoi FR-PUB-06 (« ne jamais avoir à se réabonner ») serait violée. |

## 4. Contraintes non-fonctionnelles

| ID | Exigence | Justification |
|---|---|---|
| NFR-PERF-01 | Le Système DOIT supporter au moins 5 000 utilisateurs simultanés avec un temps de réponse p95 < 2 s sur les opérations de lecture. | Décision de cadrage 2026-08-11, à réviser après le pilote avec des données réelles d'usage. |
| NFR-DISPO-01 | Le Système DOIT rester consultable en lecture seule sans connexion réseau, à partir des données de la dernière synchronisation réussie. | Coupures réseau/électriques résiduelles documentées (cahier des charges §1.4). |
| NFR-DATA-01 | Le Système DOIT charger l'emploi du temps en moins de 3 secondes sur un réseau 3G, sur un navigateur Android d'entrée de gamme. | Coût réel de la donnée pour l'étudiant moyen, parc de terminaux dominé par l'Android économique. |
| NFR-SEC-01 | Le Système DOIT chiffrer toutes les communications en transit (HTTPS). | Standard attendu pour un système académique institutionnel. |
| NFR-SEC-02 `[V3, révisé]` | Un **Visiteur public** NE DOIT avoir aucun droit d'écriture, sur aucune donnée du système. *(V2 : « un Étudiant » — c'est désormais tout visiteur non authentifié qui est concerné, ce qui élargit la règle au lieu de l'affaiblir.)* | RBAC, cahier des charges §4.6 ; corollaire direct de FR-AUTH-06. |
| NFR-SEC-03 `[V3]` | La surface publique NE DOIT exposer **aucune donnée nominative d'étudiant** — ni INE, ni nom, ni composition de groupe, ni effectif nominatif. Seuls sont publiables les éléments constitutifs du programme : UE, enseignant, salle, horaire, statut. | Un programme public ne doit pas devenir un annuaire d'étudiants consultable par n'importe qui. |
| NFR-LEGAL-01 `[V3, complété]` | Le Système DOIT informer les personnes concernées de la finalité du traitement de leurs données personnelles, **et mentionner explicitement que le nom des enseignants figure sur un programme accessible publiquement**. | Loi n°001-2021/AN portant protection des données personnelles. La publication du nom de l'enseignant reproduit ce que font déjà les tableaux d'affichage physiques des UFR, mais doit être déclarée puisqu'elle change d'échelle en devenant consultable en ligne. |
| NFR-DATA-02 `[V3]` | La page publique de consultation d'un programme DOIT rester utilisable sur un terminal Android d'entrée de gamme en 3G, **sans authentification préalable ni chargement du référentiel complet** — seules les données du programme demandé DOIVENT être transférées. | C'est la page la plus consultée du système, par la population au budget data le plus contraint (cahier des charges §1.4). |

## 5. Cas d'erreur

| ID | Scénario | Comportement attendu |
|---|---|---|
| ERR-01 | La base de données est inaccessible au moment d'une lecture. | Le Système DOIT servir la dernière version en cache avec l'indicateur de fraîcheur visible (FR-OFF-02), plutôt qu'une erreur bloquante. |
| ERR-02 | Un import de référentiel contient une ligne invalide (champ obligatoire manquant, doublon). | Le Système DOIT rejeter uniquement cette ligne et produire un rapport d'anomalies, sans bloquer l'import des lignes valides. |
| ERR-03 `[V3, révisé]` | Une alerte navigateur échoue ou est refusée (terminal incompatible, permission refusée, PWA non installée). | Le Système DOIT continuer de fonctionner sans dégradation : le programme public reste consultable et l'agenda abonné reste alimenté (FR-PUB-06). **Aucun repli SMS** — ce canal est retiré (FR-NOTIF-03/04 retirées). |
| ERR-04 | Deux modifications concurrentes sont soumises sur le même créneau au même instant. | Le Système DOIT appliquer la première validée et signaler un conflit à la seconde, sans écraser silencieusement les données. |
| ~~ERR-05~~ `[V2]` | ~~Un import contient un INE déjà présent.~~ | **`[V3.1]` Retirée** avec l'import d'étudiants. |
| ~~ERR-06~~ `[V2]` | ~~Un Gestionnaire tente de rattacher un Étudiant d'une autre UFR.~~ | **`[V3.1]` Retirée** avec le référentiel nominatif. |
| ERR-10 `[V3.1]` | Un Gestionnaire crée un groupe sans renseigner son effectif (valeur laissée à zéro). | Le Système DOIT accepter la création — un groupe peut légitimement être créé avant la rentrée — mais l'effectif restant à zéro, **aucun conflit de capacité ne sera jamais signalé** pour ce groupe. Cette conséquence DOIT être rendue visible au Gestionnaire à l'endroit où l'effectif est affiché, plutôt que découverte le jour où un amphithéâtre se révèle trop petit. |
| ERR-07 `[V3]` | La cascade de sélection publique (FR-PUB-02) n'aboutit à aucun programme (combinaison UFR/département/niveau sans groupe, ou groupe sans aucun créneau saisi). | Le Système DOIT l'indiquer explicitement au visiteur et lui permettre de revenir en arrière dans la cascade, plutôt que d'afficher une grille vide sans explication — un programme vide et une combinaison inexistante ne DOIVENT pas se ressembler. |
| ERR-08 `[V3]` | Un visiteur consulte un programme mis en favori dont le groupe a depuis été supprimé, ou dont la période académique est terminée. | Le Système DOIT le signaler clairement au visiteur et lui proposer de refaire une sélection (FR-PUB-02), sans afficher un programme périmé comme s'il était courant. |
| ERR-09 `[V3]` | Le Gestionnaire annule une occurrence datée (FR-EDT-07) sur un créneau déjà annulé pour toute la période (FR-EDT-03). | Le Système DOIT rejeter l'opération comme sans objet plutôt que d'enregistrer une annulation d'annulation, conformément à la distinction posée par RM-10. |

## 6. Test de validité (auto-vérification)

Chaque exigence ci-dessus est : **validable** (rattachée à un problème du PRD), **testable** (peut devenir un test unitaire/intégration), **contestable** (un chiffre ou un DOIT/NE DOIT PAS précis, pas un adjectif vague). Aucune exigence ne mentionne de technologie (SQL, NestJS, React) — ce choix appartient au document d'architecture.

---

*Document d'ingénierie — Étape 2/5, révision V3 du 2026-09-07. Prochaine étape : Contrat Système & Invariants (`03_Contrat_Invariants_Campus_Manager.md`).*
