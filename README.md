# Campus Manager — Frontend (PWA)

Frontend de **Campus Manager**, l'outil de gestion en temps réel des emplois du
temps de l'UJKZ (Burkina Faso). Ce dépôt contient uniquement le frontend
(PWA Next.js) ; le backend (NestJS + PostgreSQL) vit dans un dépôt séparé.

Contexte complet du projet : les documents d'ingénierie (PRD, SRS, Contrat &
Invariants, Architecture, UML/C4) sont dans [`docs/`](docs/). Le cahier des
charges complet et le guide méthodologique restent dans le dossier partagé de
l'équipe (`Projet_emploi_de_temps/`, un niveau au-dessus de ce dépôt) — ils ne
sont pas dupliqués ici pour éviter d'avoir deux copies à maintenir.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tokens de design définis dans `src/app/globals.css`)
- **lucide-react** pour les icônes
- PWA : `src/app/manifest.ts` + service worker minimal (`public/sw.js`)
- Aucune police externe (pas de `next/font/google`) — volontaire, cf. §1.4 du
  cahier des charges (sobriété des données, réseau parfois limité)

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Comptes de démonstration (mock, cf. `src/lib/mock-data.ts`) :

| Rôle | Identifiant | Mot de passe |
|---|---|---|
| Étudiant | `20230145` | `password` |
| Enseignant | `kabore.enseignant` | `password` |
| Scolarité | `scolarite.info` | `password` |

```bash
npm run lint       # ESLint (flat config, Next 16)
npx tsc --noEmit   # vérification des types
npm run build      # build de production
```

## État actuel : tout est mocké, pas encore branché sur l'API réelle

**Il n'y a pas encore de backend.** Pour pouvoir construire et démontrer les
écrans dès maintenant, ce dépôt simule le backend avec :

- `src/lib/mock-data.ts` — jeux de données factices (utilisateurs, salles,
  créneaux, notifications, demandes, audit).
- `src/app/api/auth/{login,activate,logout}/route.ts` — endpoints Next.js qui
  posent un cookie de session en clair (`cm_session`, JSON non signé). **Ceci
  n'est pas un mécanisme d'authentification sécurisé** — c'est un bouchon à
  remplacer entièrement par des appels à l'API NestJS (JWT ou session serveur)
  une fois celle-ci disponible.
- `src/lib/conflict-detection.ts` — un décalque du moteur de détection de
  conflits (FR-CONF-01→04) pour donner à voir de vrais résultats à l'écran
  `/scolarite/planning`. **La version qui fait foi doit vivre côté API**
  (`ConflictEngineModule`, cf. [`docs/04_Exigence_Architecture_Campus_Manager.md`](docs/04_Exigence_Architecture_Campus_Manager.md)).
- `src/app/api/enseignants/route.ts` — provisionnement d'un compte enseignant
  à la volée depuis le formulaire de créneau (nom/prénom/identifiant
  uniquement, jamais de mot de passe saisi par la scolarité — l'enseignant
  active son compte lui-même via `/activation`, FR-AUTH-03/04 ; FR-REF-04/05
  dans le SRS).
- `src/app/api/salles/route.ts` — création de salle (FR-REF-02) depuis
  `/scolarite/salles`.
- `src/app/api/groupes/route.ts`, `src/app/api/cours/route.ts` — référentiel
  des groupes et des unités d'enseignement (FR-REF-01), depuis
  `/scolarite/groupes`, `/scolarite/cours`, et le raccourci "+ Autre
  (préciser)" du formulaire de créneau.
- `src/app/api/creneaux/route.ts` — création/modification de créneau
  (FR-EDT-01/02/03) depuis `/scolarite/planning/[groupeId]`. Un "programme"
  = l'emploi du temps d'**un seul groupe** (décision de cadrage
  2026-08-17) : `/scolarite/planning` liste un programme par groupe,
  `/scolarite/planning/[groupeId]` est la feuille dédiée à un groupe (le
  formulaire de créneau y reçoit `groupes={[leGroupeCourant]}`, verrouillé).
  Le moteur de conflits, lui, reste vérifié contre **tous** les créneaux de
  l'UFR pilote, pas seulement ceux du groupe affiché — une salle ou un
  enseignant réservé en double par un autre groupe doit rester un vrai
  conflit (FR-CONF-01/02).
- `src/app/api/audit/route.ts` — journal d'audit (FR-AUD-01), écrit par
  `/scolarite/planning/[groupeId]` à chaque création/modification/annulation
  de créneau, lu par `/scolarite/audit` et l'aperçu du tableau de bord.

Toutes ces routes gardent leurs données en mémoire du process `next dev` :
perdues au redémarrage. **Détail important pour la suite** : les pages qui
affichent ces listes ne les récupèrent **pas** via
un import statique de `mock-data.ts`, mais via un `fetch()` client vers la
route `GET` correspondante au chargement. C'est volontaire : en dev, Turbopack
(Next.js 16) ne garantit pas qu'une Page et une Route Handler partagent la
même instance de module — un import statique affichait donc des données
périmées après une création via l'API, même si celle-ci avait réussi. Passer
par une vraie requête HTTP contourne le problème. Cette contrainte disparaît
avec un vrai backend (la donnée vivra en base, pas en mémoire JS).

Tout ce qui est mock est commenté comme tel dans le code, avec une référence à
l'exigence SRS concernée.

## Contrat API — point de coordination avec le backend

`src/lib/types.ts` définit le contrat de données attendu par le frontend
(dérivé de [`docs/02_SRS_Campus_Manager.md`](docs/02_SRS_Campus_Manager.md) et
[`docs/03_Contrat_Invariants_Campus_Manager.md`](docs/03_Contrat_Invariants_Campus_Manager.md)) :
`Utilisateur`, `Role`, `Groupe`, `Salle`, `Creneau`, `ConflitDetecte`,
`NotificationItem`, `DemandeEnseignant`, `AuditEntry`, `DashboardStats`.

**Ce fichier est la référence à partager avec le backend.** Toute évolution du
modèle de données doit être discutée entre les deux équipes et répercutée ici
— c'est ce qui évite que le frontend et le backend divergent silencieusement.

Quand l'API sera prête, les points de bascule sont limités à :

1. `src/lib/session.ts` + les 3 routes `src/app/api/auth/*` → remplacer par de
   vrais appels à l'API NestJS (`AuthModule`).
2. Chaque import de `src/lib/mock-data.ts` dans les pages → remplacer par un
   appel réseau vers l'API correspondante.
3. `src/lib/conflict-detection.ts` → à terme, n'afficher que ce que renvoie
   l'API (le calcul ne doit exister qu'à un seul endroit).

## Structure

```
src/
  app/                    routes (App Router)
    page.tsx              accueil public
    connexion/            connexion (pas de sélecteur de rôle, cf. FR-AUTH-02)
    activation/            activation de compte pré-provisionné
    aide/                  page d'assistance / mentions données personnelles
    etudiant/              espace étudiant (layout protégé par rôle)
    enseignant/            espace enseignant
    scolarite/             espace scolarité d'UFR (planning, salles, demandes, audit)
    api/auth/              endpoints mock d'authentification
    manifest.ts            manifest PWA
    icon.svg               favicon / icône PWA
  components/
    layout/                Sidebar, OfflineBanner, RoleGuardShell
    ui/                    Avatar, StatusBadge
    schedule/               ScheduleWeekGrid (grille horaire partagée)
    conflicts/              ConflictPanel
    demandes/               formulaires et liste de validation
    audit/                  AuditTable
    pwa/                    enregistrement du service worker
  lib/
    types.ts                contrat de données (voir ci-dessus)
    mock-data.ts             données factices
    conflict-detection.ts    moteur de conflits (démo)
    session.ts                lecture de session (server-only, next/headers)
    roles.ts                  utilitaire de routage par rôle (client-safe)
  hooks/
    useSyncStatus.ts          état en ligne/hors-ligne + dernière synchro
```

## Périmètre MVP (rappel)

3 rôles seulement (Étudiant, Enseignant, Scolarité d'UFR), une seule UFR
pilote — décision de cadrage documentée dans [`docs/01_PRD_Campus_Manager.md`](docs/01_PRD_Campus_Manager.md). Les
rôles DEP/DSI et la gestion des salles communes/louées sont hors périmètre
pour cette version.

## Connu comme non fini (prochaines étapes frontend)

- Le formulaire de créneau (`CreneauFormModal`) et le provisionnement
  d'enseignant à la volée (`POST /api/enseignants`) sont en place, mais rien
  n'est persisté au-delà de la session du serveur de dev (données en mémoire,
  perdues au redémarrage) — normal tant qu'il n'y a pas de vraie base.
- Vraie pagination / filtres sur le journal d'audit et le référentiel des
  salles (FR-REF-01 : import Excel/CSV).
- Remplacement du cookie de session mock par un vrai mécanisme d'auth une
  fois l'API disponible.
- Les actions "Ignorer" / "Valider malgré tout" du panneau de conflits ne
  font que masquer la carte localement (pas de dérogation tracée) ; la vraie
  dérogation avec motif se fait via "Corriger" / "Modifier salle", qui ouvre
  le formulaire de créneau (FR-CONF-07/08).
- **Les créneaux créés/modifiés côté scolarité ne sont pas visibles côté
  étudiant/enseignant.** Depuis la restructuration en "programmes" (un par
  groupe, décision de cadrage 2026-08-17), `/scolarite/planning/[groupeId]`
  passe bien par `GET/POST /api/creneaux` (une seule source de vérité côté
  scolarité). Mais les vues étudiant/enseignant lisent encore
  `MOCK_CRENEAUX`, un jeu de données mock séparé de celui que sert cette
  route (`MOCK_CRENEAUX_SCOLARITE`). À corriger en pointant aussi les vues
  étudiant/enseignant vers `/api/creneaux` (filtré par `groupeId`/
  `enseignantId`) une fois l'API réelle disponible.
- Journal d'audit (`/scolarite/audit`, `POST /api/audit`) : les entrées
  créées pendant la session sont bien écrites, mais le champ `motif` de
  dérogation d'un conflit *avertissement* "Ignoré" / "Validé malgré tout"
  (boutons secondaires du panneau de conflits) n'y est pas tracé — seul le
  passage par le formulaire de créneau ("Corriger" / "Modifier salle")
  écrit dans le journal.
