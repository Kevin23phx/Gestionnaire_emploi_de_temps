# Campus Manager — Frontend

Frontend de **Campus Manager**, l'outil de gestion des emplois du temps de
l'Université Joseph Ki-Zerbo (Burkina Faso). Ce dépôt contient uniquement le
frontend (PWA Next.js) ; le backend est un projet séparé, voir ci-dessous.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Vitest** pour les tests unitaires

## Architecture — deux dépôts

Le projet tient en deux dépôts distincts, chacun déployé séparément :

| | Ce dépôt | Backend |
|---|---|---|
| Contenu | Frontend Next.js | API Django REST |
| Dépôt GitHub | `Gestionnaire_emploi_de_temps` | `Gestionnaire_emploi_de_temps_backDjango` |
| Déploiement | Cloudflare Workers | Render |
| En production | https://campus-manager.nitiemamartial.workers.dev | (Render, voir le backend) |

Le frontend appelle le backend via un relais interne (`/api/*`, voir
`next.config.ts`) : côté navigateur, tout se passe sur un seul domaine, ce
qui est nécessaire pour que le cookie de session fonctionne. Le détail est
expliqué en tête de `src/lib/api.ts`.

## Lancer le projet en local

Les deux dépôts doivent être clonés **côte à côte** (même dossier parent) :

```
un-dossier/
  Gestionnaire_emploi_de_temps/              (ce dépôt)
  Gestionnaire_emploi_de_temps_backDjango/   (le backend)
```

Le backend nécessite Python 3.12+ et PostgreSQL — voir son propre README
pour l'installation (base de données, migrations, variables d'environnement).
Une fois le backend cloné et son `.env` créé (copier `.env.example`), tout
se lance en une commande depuis ce dépôt :

```bash
./start.sh
```

Ce script démarre la base PostgreSQL (Docker), le backend Django et le
frontend Next.js. `Ctrl+C` arrête l'ensemble proprement.

```bash
./start.sh --seed     # + réinitialise les données de démonstration
./start.sh --back     # backend seul, sans le frontend
./start.sh --help     # toutes les options
```

`--seed` **vide et recrée entièrement** la base de données locale (les 12
établissements de l'UJKZ, un exemple de programme publié) — à utiliser sur
une base neuve ou dont le contenu peut être perdu, jamais sur une base
contenant des données saisies à la main qu'on veut garder. Sans base locale
existante, c'est l'étape à faire en premier pour obtenir les comptes
ci-dessous.

Si le backend n'est pas cloné juste à côté de ce dépôt :
`BACKEND_DIR=/chemin/vers/le/backend ./start.sh`

Ouvrir ensuite [http://localhost:3000](http://localhost:3000).

### Comptes de démonstration

Après `./start.sh --seed`, mot de passe `password` pour tous :

| Rôle | Identifiant |
|---|---|
| Administrateur (toutes les UFR) | `scolarite.general` |
| Scolarité d'un établissement | `scolarite.<sigle>` — ex. `scolarite.sea`, `scolarite.lac` |

La consultation publique d'un emploi du temps (page d'accueil) ne demande
aucun compte.

## Tests

```bash
npm test         # tests unitaires (Vitest) — logique pure de src/lib, proxy
npm run lint      # ESLint
npx tsc --noEmit  # vérification des types
```

Les tests d'intégration (API, base de données) vivent dans le dépôt backend
(`scripts/test.sh`).

## Déploiement

Voir [`CLOUDFLARE_DEPLOY.md`](CLOUDFLARE_DEPLOY.md) — le déploiement est
automatique à chaque push sur `main` (GitHub Actions → Cloudflare Workers),
sous réserve que le secret `CLOUDFLARE_API_TOKEN` soit configuré sur le
dépôt.

## Documentation d'ingénierie

Les documents de cadrage (exigences, contrat de données, architecture) sont
dans [`docs/`](docs/).

## Structure

```
src/
  app/
    page.tsx                accueil public — recherche d'emploi du temps
    programme/[groupeId]/   emploi du temps public d'une promotion
    connexion/               connexion (comptes scolarité/admin)
    activation/               activation d'un compte pré-provisionné
    apres-connexion/          aiguillage post-connexion selon le rôle
    admin/                    supervision multi-UFR (réservé Admin)
    scolarite/                 gestion d'un établissement (Gestionnaire) :
                                planning, salles, cours, départements,
                                spécialités, promotions, journal d'audit
    aide/                      assistance / protection des données
  components/                 par domaine (planning, groupes, cours, salles,
                               audit, filtres, layout, public)
  lib/
    types.ts                  contrat de données partagé avec le backend
    api.ts                    appels réseau, gestion de la session
    conflict-detection.ts     détection de conflits côté écran (décalque du
                               moteur qui fait foi, côté backend)
    filtres.ts, semaines.ts, pauses.ts, disponibilites.ts, referentiel-options.ts
                               logique pure, couverte par les tests unitaires
  proxy.ts                    masquage de l'espace Admin (voir espace-admin.ts)
```
