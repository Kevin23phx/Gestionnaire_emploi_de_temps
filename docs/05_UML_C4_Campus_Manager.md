# Modélisation UML & C4 — Campus Manager

**Étape 5 de la chaîne méthodologique** — répond à : *comment le système se comporte-t-il, et comment est-il structuré pour supporter ce comportement ?*
Règle d'or respectée : le **comportement (UML)** est modélisé avant la **structure (C4)**. Ordre suivi : C4 Contexte → UML Cas d'usage → UML Séquence → C4 Conteneur → C4 Composant.

> **`[V3.2]` Révision du 2026-09-07.** Le périmètre passe de 5 UFR à **12 établissements** (5 UFR, 6 instituts, 1 école doctorale) et 53 départements. Dans les diagrammes, l'acteur « Gestionnaire d'établissement » devient « Gestionnaire d'établissement », et le composant `referentiel` porte désormais le référentiel des départements.

> **`[V3.1]` Révision du 2026-09-07 (même journée).** Le référentiel nominatif des étudiants est supprimé : l'effectif d'un groupe est un nombre saisi. Disparaissent des diagrammes ci-dessous : les cas d'usage « Importer le référentiel académique », « Télécharger le canevas d'import », « Filtrer les étudiants » et « Transférer un étudiant vers une autre UFR ». Apparaît à leur place « Déclarer l'effectif d'un groupe ».

> **`[V3]` Révision du 2026-09-07.** Les diagrammes ci-dessous sont ceux de la V3 (programme public, cf. `01_PRD` note 2026-09-07). Trois changements les traversent tous : les acteurs **Étudiant** et **Enseignant** sont remplacés par un unique **Visiteur public** non authentifié ; le composant `demandes` et le composant `notifications` disparaissent au profit d'un composant **`public`** ; et le canal **SMS** disparaît au profit de l'**agenda personnel** et d'une alerte navigateur. Les noms de composants sont également passés de la forme NestJS à la forme Django, conformément à la rectification de stack notée dans `04_Exigence_Architecture_Campus_Manager.md`.

---

## 1. C4 — Niveau Contexte

*Où s'inscrit le système ? Qui lui parle, quels systèmes externes touche-t-il ?*

```mermaid
graph TB
    Visiteur(("Visiteur public [V3]<br/>étudiant, enseignant, parent…<br/>non authentifié"))
    Scolarite((Gestionnaire d'établissement))
    Admin((Admin))
    CM[Campus Manager]
    Agenda[["Agenda personnel du visiteur<br/>Google Agenda / Outlook / iOS / Android"]]
    Push[["Service Web Push du navigateur"]]
    CF[["CampusFaso<br/>(hors périmètre, interopérabilité future)"]]

    Visiteur -->|"cherche un programme (UFR → filière → niveau → groupe), sans compte"| CM
    Scolarite -->|gère le référentiel et l'emploi du temps de son UFR| CM
    Admin -->|crée les UFR et gestionnaires, supervise en lecture| CM
    CM -->|"flux calendrier abonné, relu périodiquement par le fournisseur"| Agenda
    Agenda -->|affiche le programme et ses changements| Visiteur
    CM -->|"alerte immédiate, si activée sur un favori"| Push
    CM -.->|export/import futur, non connecté| CF
```

> **Ce que ce diagramme dit de neuf.** Le système n'a plus de population d'utilisateurs à connaître du côté consultation : la flèche entrante ne part plus d'un compte mais d'un anonyme. Et surtout, une flèche **sortante** apparaît vers un système que Campus Manager ne contrôle pas — l'agenda du visiteur. C'est le premier point du système où la donnée quitte durablement le périmètre et vit sa vie ailleurs, au rythme de rafraîchissement d'un tiers (cf. `02_SRS` FR-NOTIF-05).

## 2. UML — Cas d'usage

*Quelles fonctionnalités sont dans le périmètre du MVP ?* (dérivé directement du SRS §2)

```mermaid
graph LR
    subgraph Acteurs
        V(("Visiteur public<br/>[V3]"))
        S((Gestionnaire d'établissement))
        A((Admin))
    end

    subgraph "Cas d'usage — Campus Manager V3 programme public"
        UP1(["Rechercher un programme<br/>UFR → filière → niveau → groupe"])
        UP2(["Consulter un programme<br/>semaine par semaine"])
        UP3(["Mettre un programme en favori"])
        UP4(["Abonner son agenda personnel"])
        UP5(["Activer une alerte sur un favori"])
        UP6(["Consulter hors-ligne"])

        UC1(["S'authentifier / activer son compte"])
        UC22(["Créer un groupe<br/>département, niveau, année, effectif"])
        UC8(["Créer / modifier / annuler un créneau"])
        UC9(["Détecter les conflits"])
        UC19(["Annuler une séance à une date précise"])
        UC20(["Définir la période académique de son UFR"])
        UC21(["Rechercher / filtrer dans le référentiel"])
        UC11(["Consulter le journal d'audit de son UFR"])
        UC12(["Consulter le tableau de bord de son UFR"])
        UC13(["Créer un établissement<br/>UFR, institut ou école doctorale"])
        UC14(["Créer un compte Gestionnaire"])
        UC15(["Superviser tous les établissements en lecture"])
    end

    V --> UP1
    V --> UP2
    V --> UP3
    V --> UP4
    V --> UP5
    V --> UP6
    S --> UC1
    S --> UC22
    S --> UC8
    S --> UC19
    S --> UC20
    S --> UC21
    S --> UC11
    S --> UC12
    A --> UC1
    A --> UC13
    A --> UC14
    A --> UC15

    UP1 -. include .-> UP2
    UP3 -. extend .-> UP2
    UP4 -. extend .-> UP2
    UP5 -. extend .-> UP3
    UC8 -. include .-> UC9
    UC19 -. include .-> UC20
    UC14 -. include .-> UC13
    UC8 -. include .-> UC21
```

> **Cas d'usage retirés en V3.1** : ~~« Importer le référentiel académique de son UFR »~~, ~~« Télécharger le canevas d'import »~~, ~~« Filtrer les étudiants par année/filière »~~ et ~~« Transférer un étudiant vers une autre UFR »~~ — le référentiel nominatif des étudiants n'existe plus (cf. `01_PRD`, note V3.1). « Créer un groupe » les remplace : c'est là que l'effectif est déclaré, en un nombre.
>
> **Cas d'usage retirés en V3** — conservés ici en clair pour la traçabilité : ~~« S'authentifier / activer son compte » pour l'Étudiant et l'Enseignant~~ (plus de comptes), ~~« Consulter l'emploi du temps de son groupe »~~ et ~~« Consulter son planning personnel »~~ (fusionnés dans « Consulter un programme », désormais ouvert à tous), ~~« Signaler une absence / demander un report »~~, ~~« Suivre le statut d'une demande »~~ et ~~« Valider une demande enseignant »~~ (circuit de demandes retiré, `02_SRS` §2.7).
>
> Le déplacement le plus notable est celui de UC21 (« Rechercher / filtrer ») : ce n'est pas un cas d'usage de confort ajouté en marge, il est en relation `include` avec UC8 (« Créer / modifier un créneau »). Construire un créneau **suppose** de retrouver la salle et le cours — c'est ce qui justifie que la recherche vive aussi dans le formulaire de créneau et pas seulement dans les écrans de référentiel (`02_SRS` FR-FILT-04).

## 3. UML — Diagramme de séquence

*Sur la fonctionnalité la plus complexe : modification d'un créneau en conflit, avec dérogation et notification.* Ce flux est celui qui engage le plus d'invariants à la fois (INT-03, INV-02, INV-04, INV-06, FR-NOTIF-01) — c'est pourquoi il est choisi plutôt qu'un cas simple.

```mermaid
sequenceDiagram
    actor Sco as Gestionnaire de scolarité (UFR X)
    participant UI as PWA (Gestionnaire)
    participant RG as RBAC Guard
    participant PM as planning
    participant CE as conflict_engine
    participant DB as PostgreSQL
    participant AU as audit
    participant PB as public (V3)
    participant SW as Service Worker (Visiteur abonné)
    participant AG as Agenda personnel du visiteur

    Sco->>UI: Modifie le créneau (nouvelle salle, motif)
    UI->>PM: PATCH /creneaux/:id {salle, motif}
    PM->>RG: Le créneau appartient-il à l'UFR du Gestionnaire ?
    RG-->>PM: OK (sinon rejet, INT-07) [V2]
    PM->>PM: Vérifie que le motif n'est pas vide (INT-03)
    PM->>CE: Évalue les conflits (salle, enseignant, groupe, capacité)
    CE->>DB: Requête de chevauchement (contrainte EXCLUDE)
    DB-->>CE: Conflit bloquant détecté (Amphi A, 08h-10h)
    CE-->>PM: Conflit bloquant + détail
    PM-->>UI: Retourne l'alerte de conflit
    UI-->>Sco: Affiche "Conflit bloquant — Corriger / Dérogation"
    Sco->>UI: Confirme avec motif de dérogation
    UI->>PM: PATCH /creneaux/:id {motif_derogation}
    PM->>DB: Enregistre le créneau modifié
    PM->>AU: Écrit l'entrée d'audit (auteur, date, motif, dérogation)
    AU->>DB: INSERT audit_log (append-only — INV-04)
    PM->>PM: Incrémente le compteur de révision du créneau (INV-13/FR-PUB-06)
    PM->>PB: Publie l'événement "créneau modifié"
    PB->>SW: Alerte immédiate aux visiteurs abonnés à ce groupe (FR-PUB-08)
    Note over PB,AG: Le flux calendrier du groupe est<br/>désormais à jour ; l'agenda du visiteur<br/>le relira à SON rythme (FR-NOTIF-05)
    AG->>PB: Relecture périodique du flux (déclenchée par le fournisseur, pas par nous)
    PB-->>AG: Séance marquée MODIFIÉE, motif inclus, jamais omise (INV-15)
```

> **`[V3]` Ce que ce flux perd et ce qu'il gagne.** Il perd l'étape « résoudre les destinataires » : il n'y a plus de liste d'étudiants et d'enseignants à retrouver en base pour savoir qui prévenir — le programme publié *est* le message, et quiconque le regarde reçoit l'information. Il gagne en revanche une asymétrie qui n'existait pas : la dernière flèche n'est plus déclenchée par nous mais **par l'agenda du visiteur**, ce qui rend le délai final hors de notre contrôle. C'est exactement la raison d'être de l'alerte de FR-PUB-08, seule branche du diagramme qui reste, elle, sous notre maîtrise.

### 3bis. UML — Diagramme de séquence : création d'une UFR et de son Gestionnaire `[V2]`

*Second flux ajouté au passage multi-UFR : c'est celui qui engage le plus les nouveaux invariants (INT-09, INV-10) — la seule porte d'entrée pour faire exister une nouvelle UFR dans le système.*

```mermaid
sequenceDiagram
    actor Ad as Admin
    participant UI as PWA (Admin)
    participant UM as ufr
    participant DB as PostgreSQL
    participant AU as audit

    Ad->>UI: Crée une UFR (nom "UFR/SVT", sigle "svt")
    UI->>UM: POST /ufrs {nom, sigle}
    UM->>UM: Vérifie le rôle Admin (sinon rejet, INT-09)
    UM->>DB: INSERT Ufr
    Ad->>UI: Crée le compte Gestionnaire de cette UFR
    UI->>UM: POST /ufrs/:id/gestionnaire {nom, prenom}
    UM->>UM: Construit l'identifiant "scolarite.svt" (FR-ADMIN-02)
    UM->>DB: INSERT Utilisateur {role: gestionnaire, ufrId, sans mot de passe}
    UM->>AU: Écrit l'entrée d'audit (auteur Admin, UFR créée, gestionnaire créé)
    AU->>DB: INSERT audit_log (append-only — INV-04)
    UM-->>UI: UFR + identifiant du compte Gestionnaire (à activer, FR-AUTH-03)
```

### 3ter. UML — Diagramme de séquence : consultation publique et abonnement agenda `[V3]`

*Troisième flux, ajouté par la V3 : c'est désormais le chemin le plus emprunté du système, et le seul ouvert sur l'extérieur. Il engage les invariants nouveaux (INV-05 élargi, INV-12, INV-13, INT-10) et n'a aucune étape d'authentification — c'est précisément ce qui le rend digne d'être modélisé.*

```mermaid
sequenceDiagram
    actor Vis as Visiteur public (aucun compte)
    participant UI as PWA (page publique)
    participant PB as public (V3)
    participant DB as PostgreSQL
    participant LS as Stockage local de l'appareil
    participant AG as Agenda personnel

    Vis->>UI: Ouvre Campus Manager
    UI->>PB: GET /api/public/ufrs
    PB-->>UI: Les 5 UFR
    Vis->>UI: Choisit UFR/SEA
    UI->>PB: GET /api/public/filieres?ufr=sea
    PB->>DB: Filières distinctes des groupes de cette UFR
    PB-->>UI: Informatique, Mathématiques, Physique…
    Vis->>UI: Choisit Informatique, puis L2
    UI->>PB: GET /api/public/groupes?ufr=sea&filiere=…&niveau=L2
    PB-->>UI: Groupe A, Groupe B (cascade FR-PUB-02)
    Vis->>UI: Choisit Groupe A
    UI->>PB: GET /api/public/programme/{groupe}?semaine=…
    PB->>DB: Créneaux du groupe + exceptions datées de la semaine
    PB->>PB: Projection en liste blanche de champs — aucune donnée nominative d'étudiant (INV-12/INT-10)
    PB-->>UI: Programme de la semaine (UE, enseignant, salle, horaire, statut, motif)
    UI-->>Vis: Grille datée, séances annulées visibles et signalées (INV-15)

    Vis->>UI: "Mettre en favori"
    UI->>LS: Enregistre la référence du groupe (jamais côté serveur, FR-PUB-04)

    Vis->>UI: "Ajouter à mon agenda"
    UI-->>Vis: Adresse d'abonnement stable du groupe (INV-13)
    Vis->>AG: Ajoute l'abonnement, une seule fois
    loop À l'initiative du fournisseur d'agenda
        AG->>PB: GET du flux calendrier du groupe
        PB-->>AG: Programme courant, séances annulées incluses et marquées
    end
```

> **Le point de vigilance de tout ce diagramme** tient en une ligne : `public` construit **ses propres** représentations à partir du modèle, au lieu de réutiliser celles de `planning` ou `referentiel`. Réutiliser serait plus court, et c'est précisément le raccourci qui ferait fuiter, six mois plus tard, un champ ajouté innocemment à un sérialiseur partagé — sur une surface qui, elle, est ouverte à Internet (cf. `04` ligne 20).

## 4. C4 — Niveau Conteneur

*Quels services existent, et comment communiquent-ils ?*

```mermaid
graph TB
    Visiteur((Visiteur public))
    Gestion((Gestionnaire / Admin))

    subgraph "Campus Manager"
        PWApub["PWA — pages publiques [V3]<br/>recherche en cascade, programme,<br/>favoris, abonnement agenda"]
        PWAges["PWA — espace gestion<br/>vues Gestionnaire / Admin"]
        SW["Service Worker<br/>cache offline + réception des alertes"]
        APIpub["Surface publique — /api/public/... [V3]<br/>lecture seule, AllowAny, sérialiseurs dédiés"]
        API["API Backend — Django/DRF<br/>accounts, ufr, referentiel, planning,<br/>conflict_engine, audit, dashboard, sync"]
        DB[("PostgreSQL")]
    end

    Agenda[["Agenda personnel (Google / Outlook / iOS)"]]
    WebPush[["Service Web Push du navigateur"]]

    Visiteur -->|HTTPS, sans authentification| PWApub
    Gestion -->|HTTPS + session| PWAges
    PWApub --> SW
    PWAges --> SW
    PWApub -->|REST/HTTPS, JSON, lectures uniquement| APIpub
    PWAges -->|REST/HTTPS, JSON| API
    APIpub -->|SQL, lecture| DB
    API -->|SQL| DB
    APIpub -->|flux calendrier| Agenda
    APIpub -->|alerte sur favori| WebPush
    WebPush --> SW
```

> **`[V3]` Pourquoi deux surfaces plutôt qu'une API avec un filtre de plus.** La surface publique est dessinée comme un conteneur logique distinct, alors qu'elle s'exécute dans le même processus Django. Ce n'est pas une coquetterie de diagramme : elle a une politique d'authentification opposée (`AllowAny` au lieu du défaut `IsAuthenticatedCM`), ses propres représentations de données, et aucune route d'écriture. Les tenir visuellement séparées est ce qui rend visible, à la relecture, toute route qui aurait glissé du mauvais côté de la frontière.

## 5. C4 — Niveau Composant

*Zoom sur l'API Backend (NestJS) — reprend directement les modules identifiés à l'étape 4 (`04_Exigence_Architecture_Campus_Manager.md`).*

```mermaid
graph TB
    subgraph "Surface publique [V3] — aucune authentification"
        Pub["public<br/>cascade, projection programme,<br/>flux calendrier, alertes Web Push"]
    end

    subgraph "API Backend (Django/DRF) — authentifiée"
        Guard["Permissions RBAC<br/>(scope UFR + rôle Admin) [V2]"]
        Auth["accounts (auth)"]
        Ufr["ufr [V2]"]
        Ref["referentiel<br/>+ période académique [V3]<br/>+ effectif saisi [V3.1]<br/>+ départements officiels [V3.2]"]
        Plan["planning<br/>+ exceptions datées [V3]"]
        Conf["conflict_engine"]
        Audit["audit"]
        Dash["dashboard"]
        Sync["sync"]
    end
    DB[("PostgreSQL")]

    Guard --> Auth
    Plan --> Guard
    Plan --> Conf
    Plan --> Audit
    Plan --> Pub
    Plan --> Ref
    Auth --> DB
    Ufr --> Guard
    Ufr --> Auth
    Ufr --> Audit
    Ref --> Guard
    Ref --> DB
    Conf --> DB
    Audit --> DB
    Dash --> Guard
    Dash --> DB
    Sync --> DB
    Pub --> DB
    Pub --> Ref
```

> **`[V3]` Deux composants disparaissent, un apparaît.** ~~`demandes`~~ (ex-`RequestModule`) est supprimé avec le circuit de demandes ; ~~`notifications`~~ est supprimé faute de destinataire nominatif — sa responsabilité de diffusion est reprise par `public`. La flèche `planning → public` est la seule qui traverse la frontière, et elle ne va que dans ce sens : `public` ne peut rien demander à `planning`, il lit la base en lecture seule. **`public` ne dépend jamais de `Guard`** — c'est volontaire et c'est ce qui doit sauter aux yeux : ce composant ne connaît aucun utilisateur, donc il ne peut pas se tromper sur les droits de quelqu'un ; en contrepartie, il ne doit jamais exposer que ce qui est publiable par construction (INV-12).

## 6. C4 — Niveau Code

Volontairement **non modélisé** à ce stade (niveau optionnel du C4). Chaque application ci-dessus émerge en structure Django standard (View → Service → Model) au moment du code ; les diagrammes de classes détaillés n'apporteraient rien que la table de l'étape 4 ne dise déjà.

---

## Traçabilité complète

Chaque composant apparu dans ces diagrammes est retraçable jusqu'à une responsabilité (étape 4) → une garantie (étape 3) → une exigence (étape 2) → un problème réel du PRD (étape 1). C'est cette chaîne, et non le code, qui doit rester stable si la stack technique change.

---

*Document d'ingénierie — Étape 5/5, révision V3 du 2026-09-07. Le code (Django/DRF + PostgreSQL + PWA Next.js) s'appuie sur `04_Exigence_Architecture_Campus_Manager.md` pour la découpe en applications.*
