# Déploiement sur Cloudflare Workers

Chaque push sur `main` déploie automatiquement le frontend sur
`https://campus-manager.nitiemamartial.workers.dev`, via
`.github/workflows/deploy.yml`. Cette page couvre la configuration à faire
une seule fois, et ce qu'il faut savoir si ça casse.

## Étape unique à faire manuellement : le jeton Cloudflare

GitHub Actions ne peut pas déployer sans un jeton API Cloudflare — et ce
jeton, par nature, ne peut pas être commité dans le dépôt (n'importe qui
avec accès au code aurait alors accès au compte Cloudflare). Il doit être
enregistré comme **secret du dépôt** :

1. **dash.cloudflare.com → Mon profil (icône en haut à droite) → Jetons
   API → Créer un jeton**
2. Modèle **« Modifier Cloudflare Workers »** → permissions par défaut,
   sans restriction de ressource → **Créer le jeton**
3. Copier le jeton affiché (il ne réapparaîtra plus jamais)
4. Sur GitHub : **Settings du dépôt → Secrets and variables → Actions →
   New repository secret**
5. Nom : `CLOUDFLARE_API_TOKEN` — Valeur : le jeton copié à l'étape 3

Une fois ce secret posé, tout push sur `main` déclenche le déploiement
automatiquement — plus aucune étape manuelle après ça.

## Pourquoi les variables d'API ne sont PAS des secrets

`NEXT_PUBLIC_API_URL` et `API_INTERNAL_URL` (dans `.env.production`,
committé) sont des adresses publiques, pas des identifiants — elles n'ont
pas leur place dans les secrets GitHub, seulement les vrais identifiants
(le jeton Cloudflare) en ont besoin.

## `CHEMIN_ESPACE_ADMIN` — à définir AVANT le build `[V8]`

L'espace Admin n'est plus servi sous `/admin` mais sous un chemin non
annoncé (NFR-SEC-04, voir `src/lib/espace-admin.ts`). Deux points à ne pas
manquer :

1. **La valeur est figée au moment du `next build`**, pas lue au démarrage :
   elle est incorporée dans le code du proxy (`src/proxy.ts`), qui s'exécute
   en périphérie. La changer après coup suppose de reconstruire. Dans le
   workflow GitHub Actions, elle doit donc être présente à l'étape de build,
   pas seulement à l'exécution.
2. **Elle ne va PAS dans `.env.production` (committé)** — contrairement aux
   adresses d'API ci-dessus, qui sont publiques par nature. Le chemin de
   l'espace Admin est le seul réglage de ce dépôt qui perde sa valeur en
   étant publié : il se met dans les **secrets GitHub**, aux côtés du jeton
   Cloudflare.

Tant que la variable n'est pas définie, le code retombe sur un chemin par
défaut écrit dans `src/lib/espace-admin.ts` — donc public, donc à remplacer
avant toute mise en ligne réelle.

L'Admin n'a jamais à taper cette adresse : il se connecte sur `/connexion`
comme tout le monde, et `/apres-connexion` l'y dépose côté serveur.

## Pourquoi front (Cloudflare) et back (Render) sont deux domaines séparés

Le navigateur appelle `/api/*` sur le domaine de Cloudflare — jamais Render
directement — parce qu'un rewrite (`next.config.ts`, cible
`API_INTERNAL_URL`) relaie la requête en coulisses. C'est ce qui permet au
cookie de session de se poser sur *notre* domaine plutôt que sur celui du
backend, seul moyen pour nos propres pages (Server Components) de le
relire. Voir le commentaire en tête de `src/lib/api.ts` pour le détail
complet — ne pas revenir à un appel direct à Render depuis le navigateur
sans comprendre ce point, la connexion casserait de nouveau.

## Si le déploiement échoue

- **`npx wrangler deploy` échoue avec une erreur d'authentification** : le
  secret `CLOUDFLARE_API_TOKEN` est absent, expiré, ou révoqué — le
  recréer (étapes ci-dessus).
- **Le build échoue** : reproductible en local avec
  `npx opennextjs-cloudflare build` (Node ≥ 22 requis).
- **Le site est en ligne mais la recherche publique ne renvoie rien** :
  vérifier `ALLOWED_ORIGIN` côté backend (Render → Environment) — doit
  correspondre exactement à l'URL Cloudflare, sinon le CORS bloque les
  appels.

## Renommer/déplacer le déploiement

Le nom du Worker (`campus-manager`) et son sous-domaine viennent de
`wrangler.jsonc`. Y toucher change l'URL du site — coordonner avec l'équipe
avant de le faire, tous les liens déjà partagés (recherche, calendrier
`.ics`, alertes) pointent vers l'URL actuelle.
