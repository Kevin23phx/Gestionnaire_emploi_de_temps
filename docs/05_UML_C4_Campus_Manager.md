# Modélisation UML & C4 — Campus Manager

**Étape 5 de la chaîne méthodologique** — répond à : *comment le système se comporte-t-il, et comment est-il structuré pour supporter ce comportement ?*
Règle d'or respectée : le **comportement (UML)** est modélisé avant la **structure (C4)**. Ordre suivi : C4 Contexte → UML Cas d'usage → UML Séquence → C4 Conteneur → C4 Composant.

---

## 1. C4 — Niveau Contexte

*Où s'inscrit le système ? Qui lui parle, quels systèmes externes touche-t-il ?*

```mermaid
graph TB
    Etudiant((Étudiant))
    Enseignant((Enseignant))
    Scolarite((Gestionnaire de scolarité d'UFR))
    Admin((Admin))
    CM[Campus Manager]
    SMS[["Fournisseur SMS/Email externe<br/>(canal de secours)"]]
    Push[["Service Web Push du navigateur"]]
    CF[["CampusFaso<br/>(hors périmètre, interopérabilité future)"]]

    Etudiant -->|consulte son planning, reçoit des notifications| CM
    Enseignant -->|consulte son planning dans ses UFR, signale une absence| CM
    Scolarite -->|gère le référentiel et l'emploi du temps de son UFR| CM
    Admin -->|crée les UFR et gestionnaires, supervise en lecture| CM
    CM -->|notification critique| SMS
    CM -->|notification push| Push
    CM -.->|export/import futur, non connecté| CF
```

## 2. UML — Cas d'usage

*Quelles fonctionnalités sont dans le périmètre du MVP ?* (dérivé directement du SRS §2)

```mermaid
graph LR
    subgraph Acteurs
        E((Étudiant))
        T((Enseignant))
        S((Gestionnaire de scolarité d'UFR))
        A((Admin))
    end

    subgraph "Cas d'usage — Campus Manager V2 multi-UFR"
        UC1(["S'authentifier / activer son compte"])
        UC2(["Consulter l'emploi du temps de son groupe"])
        UC3(["Consulter son planning personnel"])
        UC4(["Recevoir une notification de changement"])
        UC5(["Signaler une absence / demander un report"])
        UC6(["Suivre le statut d'une demande"])
        UC7(["Importer le référentiel académique de son UFR"])
        UC8(["Créer / modifier / annuler un créneau"])
        UC9(["Détecter les conflits"])
        UC10(["Valider une demande enseignant"])
        UC11(["Consulter le journal d'audit de son UFR"])
        UC12(["Consulter le tableau de bord de son UFR"])
        UC13(["Créer une UFR"])
        UC14(["Créer un compte Gestionnaire pour une UFR"])
        UC15(["Superviser toutes les UFR en lecture"])
        UC16(["Transférer un étudiant vers une autre UFR"])
        UC17(["Filtrer les étudiants par année/filière"])
        UC18(["Télécharger le canevas d'import"])
    end

    E --> UC1
    E --> UC2
    E --> UC4
    T --> UC1
    T --> UC3
    T --> UC4
    T --> UC5
    T --> UC6
    S --> UC1
    S --> UC7
    S --> UC8
    S --> UC10
    S --> UC11
    S --> UC12
    S --> UC17
    S --> UC18
    A --> UC1
    A --> UC13
    A --> UC14
    A --> UC15
    A --> UC16

    UC7 -. include .-> UC18
    UC8 -. include .-> UC9
    UC10 -. include .-> UC8
    UC14 -. include .-> UC13
```

## 3. UML — Diagramme de séquence

*Sur la fonctionnalité la plus complexe : modification d'un créneau en conflit, avec dérogation et notification.* Ce flux est celui qui engage le plus d'invariants à la fois (INT-03, INV-02, INV-04, INV-06, FR-NOTIF-01) — c'est pourquoi il est choisi plutôt qu'un cas simple.

```mermaid
sequenceDiagram
    actor Sco as Gestionnaire de scolarité (UFR X)
    participant UI as PWA (Gestionnaire)
    participant RG as RBAC Guard
    participant PM as PlanningModule
    participant CE as ConflictEngineModule
    participant DB as PostgreSQL
    participant AU as AuditModule
    participant NM as NotificationModule
    participant SW as Service Worker (Étudiant/Enseignant)
    participant SMS as Canal SMS/Email

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
    PM->>NM: Publie l'événement "créneau modifié"
    NM->>DB: Déclenche LISTEN/NOTIFY
    NM->>SW: Push notification vers Étudiant et Enseignant concernés
    NM->>SMS: Notification critique (changement de salle le jour même)
    SW-->>Sco: Confirmation — reçue en moins d'une minute (FR-NOTIF-01)
```

### 3bis. UML — Diagramme de séquence : création d'une UFR et de son Gestionnaire `[V2]`

*Second flux ajouté au passage multi-UFR : c'est celui qui engage le plus les nouveaux invariants (INT-09, INV-10) — la seule porte d'entrée pour faire exister une nouvelle UFR dans le système.*

```mermaid
sequenceDiagram
    actor Ad as Admin
    participant UI as PWA (Admin)
    participant UM as UfrModule
    participant DB as PostgreSQL
    participant AU as AuditModule

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

## 4. C4 — Niveau Conteneur

*Quels services existent, et comment communiquent-ils ?*

```mermaid
graph TB
    Utilisateur((Étudiant / Enseignant / Gestionnaire / Admin))

    subgraph "Campus Manager"
        PWA["PWA — Next.js<br/>vues Étudiant / Enseignant / Gestionnaire / Admin"]
        SW["Service Worker<br/>cache offline + réception push"]
        API["API Backend — NestJS<br/>Auth, Accounts, Ufr, Referentiel, Planning,<br/>ConflictEngine, Notification, Audit, Request, Sync"]
        DB[("PostgreSQL<br/>données + LISTEN/NOTIFY")]
    end

    SMS[["Fournisseur SMS/Email externe"]]
    WebPush[["Service Web Push du navigateur"]]

    Utilisateur -->|HTTPS| PWA
    PWA --> SW
    PWA -->|REST/HTTPS, JSON| API
    API -->|SQL| DB
    DB -->|LISTEN/NOTIFY| API
    API -->|notification critique| SMS
    API -->|notification push| WebPush
    WebPush --> SW
```

## 5. C4 — Niveau Composant

*Zoom sur l'API Backend (NestJS) — reprend directement les modules identifiés à l'étape 4 (`04_Exigence_Architecture_Campus_Manager.md`).*

```mermaid
graph TB
    subgraph "API Backend (NestJS)"
        Guard["RBAC Guard<br/>(scope UFR + rôle Admin) [V2]"]
        Auth["AuthModule"]
        Acc["AccountsModule"]
        Ufr["UfrModule [V2, nouveau]"]
        Ref["ReferentielModule"]
        Plan["PlanningModule"]
        Conf["ConflictEngineModule"]
        Req["RequestModule"]
        Notif["NotificationModule"]
        Audit["AuditModule"]
        Dash["DashboardModule"]
        Sync["SyncModule"]
    end
    DB[("PostgreSQL")]

    Guard --> Auth
    Plan --> Guard
    Plan --> Conf
    Plan --> Audit
    Plan --> Notif
    Req --> Plan
    Req --> Audit
    Acc --> Auth
    Ufr --> Guard
    Ufr --> Acc
    Ufr --> Audit
    Ref --> Guard
    Ref --> DB
    Conf --> DB
    Audit --> DB
    Notif --> DB
    Dash --> Guard
    Dash --> DB
    Sync --> DB
```

## 6. C4 — Niveau Code

Volontairement **non modélisé** à ce stade (niveau optionnel du C4). Chaque module ci-dessus émergera en classes/interfaces NestJS standard (Controller → Service → Repository) au moment du code ; les diagrammes de classes détaillés n'apporteraient rien que la table de l'étape 4 ne dise déjà.

---

## Traçabilité complète

Chaque composant apparu dans ces diagrammes est retraçable jusqu'à une responsabilité (étape 4) → une garantie (étape 3) → une exigence (étape 2) → un problème réel du PRD (étape 1). C'est cette chaîne, et non le code, qui doit rester stable si la stack technique change.

---

*Document d'ingénierie — Étape 5/5, fin de la chaîne méthodologique. Le code (NestJS + PostgreSQL + PWA) peut maintenant commencer, en s'appuyant sur `04_Exigence_Architecture_Campus_Manager.md` pour la découpe en modules.*
