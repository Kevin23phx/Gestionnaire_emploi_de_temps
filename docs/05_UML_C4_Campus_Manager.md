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
    Scolarite((Scolarité d'UFR))
    CM[Campus Manager]
    SMS[["Fournisseur SMS/Email externe<br/>(canal de secours)"]]
    Push[["Service Web Push du navigateur"]]
    CF[["CampusFaso<br/>(hors périmètre MVP, interopérabilité future)"]]

    Etudiant -->|consulte son planning, reçoit des notifications| CM
    Enseignant -->|consulte son planning, signale une absence| CM
    Scolarite -->|gère le référentiel et l'emploi du temps| CM
    CM -->|notification critique| SMS
    CM -->|notification push| Push
    CM -.->|export/import futur, non connecté au MVP| CF
```

## 2. UML — Cas d'usage

*Quelles fonctionnalités sont dans le périmètre du MVP ?* (dérivé directement du SRS §2)

```mermaid
graph LR
    subgraph Acteurs
        E((Étudiant))
        T((Enseignant))
        S((Scolarité d'UFR))
    end

    subgraph "Cas d'usage — Campus Manager MVP"
        UC1(["S'authentifier / activer son compte"])
        UC2(["Consulter l'emploi du temps de son groupe"])
        UC3(["Consulter son planning personnel"])
        UC4(["Recevoir une notification de changement"])
        UC5(["Signaler une absence / demander un report"])
        UC6(["Suivre le statut d'une demande"])
        UC7(["Importer le référentiel académique"])
        UC8(["Créer / modifier / annuler un créneau"])
        UC9(["Détecter les conflits"])
        UC10(["Valider une demande enseignant"])
        UC11(["Consulter le journal d'audit"])
        UC12(["Consulter le tableau de bord"])
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

    UC8 -. include .-> UC9
    UC10 -. include .-> UC8
```

## 3. UML — Diagramme de séquence

*Sur la fonctionnalité la plus complexe : modification d'un créneau en conflit, avec dérogation et notification.* Ce flux est celui qui engage le plus d'invariants à la fois (INT-03, INV-02, INV-04, INV-06, FR-NOTIF-01) — c'est pourquoi il est choisi plutôt qu'un cas simple.

```mermaid
sequenceDiagram
    actor Sco as Scolarité d'UFR
    participant UI as PWA (Scolarité)
    participant PM as PlanningModule
    participant CE as ConflictEngineModule
    participant DB as PostgreSQL
    participant AU as AuditModule
    participant NM as NotificationModule
    participant SW as Service Worker (Étudiant/Enseignant)
    participant SMS as Canal SMS/Email

    Sco->>UI: Modifie le créneau (nouvelle salle, motif)
    UI->>PM: PATCH /creneaux/:id {salle, motif}
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

## 4. C4 — Niveau Conteneur

*Quels services existent, et comment communiquent-ils ?*

```mermaid
graph TB
    Utilisateur((Étudiant / Enseignant / Scolarité))

    subgraph "Campus Manager"
        PWA["PWA — Next.js<br/>vues Étudiant / Enseignant / Scolarité"]
        SW["Service Worker<br/>cache offline + réception push"]
        API["API Backend — NestJS<br/>Auth, Planning, ConflictEngine,<br/>Notification, Audit, Request, Sync"]
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
        Guard["RBAC Guard"]
        Auth["AuthModule"]
        Acc["AccountsModule"]
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
    Ref --> DB
    Conf --> DB
    Audit --> DB
    Notif --> DB
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
