/**
 * Point de bascule unique vers l'API (Django/DRF, dépôt `backend_django/`).
 * Utilisable depuis les Client Components — pour les Server Components, voir
 * `api-server.ts`.
 *
 * ## Pourquoi l'adresse de l'API est calculée et non écrite en dur
 *
 * Le cookie de session est posé en `SameSite=Lax` (accounts/session_service.py),
 * ce qui interdit au navigateur de l'envoyer sur une requête **cross-site**.
 * Or « site » se juge sur l'HÔTE, en ignorant le port : `localhost:3000` et
 * `localhost:3001` sont le même site, mais `localhost:3000` et
 * `192.168.x.y:3001` sont deux sites différents.
 *
 * Conséquence concrète, constatée en usage : avec une adresse d'API figée sur
 * l'IP du réseau local, l'application marchait depuis le téléphone
 * (IP → IP, même hôte) mais pas depuis `localhost:3000` — la connexion
 * réussissait, puis toutes les requêtes suivantes repartaient sans cookie,
 * donc en 401.
 *
 * L'API est donc appelée **sur l'hôte depuis lequel la page est consultée**,
 * quel qu'il soit. Front et back restent deux origines distinctes (d'où
 * `credentials: "include"` et la configuration CORS côté Django), mais
 * toujours le même *site* — le cookie circule dans tous les cas.
 *
 * En production (front sur Cloudflare, back sur Render — deux domaines,
 * pas seulement deux ports), la déduction ci-dessus n'a plus de sens :
 * `NEXT_PUBLIC_API_URL` vaut alors "/api", un chemin RELATIF. Le navigateur
 * l'appelle donc sur SON PROPRE domaine (Cloudflare), qui le relaie vers
 * Render (rewrite dans next.config.ts) — c'est ce qui compte : Set-Cookie
 * revient alors comme si la réponse venait de notre domaine, donc le cookie
 * s'y pose, au lieu de se poser sur onrender.com où aucune de nos pages ne
 * pourrait jamais le relire côté serveur (cookies() ne voit que ce que LE
 * NAVIGATEUR envoie à NOTRE domaine, jamais un cookie posé ailleurs).
 *
 * Le serveur (Server Components), lui, n'est jamais concerné par ce
 * problème : il appelle Render en direct, hors du navigateur — aucune règle
 * de same-origin/SameSite ne s'y applique, seul compte le retransfert manuel
 * du cookie entrant (api-server.ts). D'où le double aiguillage ci-dessous :
 * NEXT_PUBLIC_API_URL ne doit influencer QUE le client.
 */

// Utilisé uniquement par le NAVIGATEUR. En prod : "/api" (relatif, proxié —
// voir next.config.ts). Vide en dev pour la déduction dynamique ci-dessous.
const API_URL_EXPLICITE = process.env.NEXT_PUBLIC_API_URL?.trim();

// Port du backend. Django écoute sur 3001 par défaut (cf. backend_django/.env).
const API_PORT = process.env.NEXT_PUBLIC_API_PORT?.trim() || "3001";

// Utilisée par les Server Components (aucun `window` : le rendu se fait sur
// le serveur). En dev, le backend tourne en local ; en prod, pointe Render
// directement (jamais le chemin relatif ci-dessus, qui ne veut rien dire
// hors d'un navigateur).
const API_URL_INTERNE = process.env.API_INTERNAL_URL?.trim() || `http://127.0.0.1:${API_PORT}/api`;

export function apiBaseUrl(): string {
  if (typeof window === "undefined") return API_URL_INTERNE;
  if (API_URL_EXPLICITE) return API_URL_EXPLICITE;
  // Même protocole et même hôte que la page courante : c'est ce qui garantit
  // que le cookie de session est joint à la requête (voir en-tête).
  return `${window.location.protocol}//${window.location.hostname}:${API_PORT}/api`;
}

export function apiUrl(path: string): string {
  return `${apiBaseUrl()}${path}`;
}

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(apiUrl(path), { ...init, credentials: "include" });
}

/**
 * [V8] Lit le corps d'une réponse sans jamais lever d'exception.
 *
 * Écrit après un incident reproduit le 2026-09-21 : le bouton « Ajouter »
 * de l'écran Spécialités restait bloqué sur « Création... », indéfiniment
 * et sans message. La cause n'était pas dans le bouton — le serveur
 * renvoyait une erreur 500 en HTML (une table manquait en base), et
 * `await reponse.json()` levait sur cette page HTML. L'exception partait
 * AVANT le `setEnCours(false)` de la ligne suivante : le formulaire
 * restait donc figé dans son état « en cours », et l'utilisateur n'avait
 * aucun moyen de savoir ce qui s'était passé.
 *
 * Le défaut est structurel, pas accidentel : `reponse.json()` ne peut
 * réussir que si le serveur a répondu du JSON — c'est-à-dire précisément
 * ce dont on n'est PLUS sûr quand quelque chose a mal tourné. Chaque appel
 * qui l'enchaîne directement porte donc le même risque de blocage.
 *
 * Renvoie toujours un objet : `{}` quand le corps n'est pas du JSON. À
 * l'appelant de décider quoi en faire — mais il décidera, au lieu de
 * s'arrêter net.
 */
export async function lireReponse<T = Record<string, unknown>>(reponse: Response): Promise<T> {
  try {
    return (await reponse.json()) as T;
  } catch {
    return {} as T;
  }
}

/**
 * [V8] Message d'erreur à montrer à l'utilisateur pour une réponse en
 * échec. Le backend renvoie `{ erreur: "..." }` (message rédigé pour un
 * humain) ; quand il n'a rien pu renvoyer de tel — panne, coupure réseau,
 * erreur 500 non gérée — un repli générique vaut mieux qu'un silence, et
 * le code HTTP y est joint pour que l'anomalie soit rapportable.
 */
export function messageErreur(reponse: Response, corps: { erreur?: string }, repli: string): string {
  if (corps.erreur) return corps.erreur;
  if (reponse.status >= 500) {
    return `${repli} Le serveur a répondu une erreur ${reponse.status} — réessayez, et signalez-le si cela persiste.`;
  }
  return repli;
}

/**
 * [V8.6, 2026-09-23] Charge du JSON pour un écran authentifié, sans jamais
 * laisser planter ni figer l'écran.
 *
 * ## L'incident qui l'a motivée
 *
 * `AuditApercu` faisait `apiFetch("/audit").then(r => r.json()).then(d =>
 * setEntries(d.entries.slice(0, 5)))`. La session du Gestionnaire a expiré
 * (8 h par défaut) ; l'API a répondu **401 `{"erreur": "Non connecté."}`**
 * — du JSON parfaitement valide, mais sans `entries`. D'où le
 * `TypeError: Cannot read properties of undefined (reading 'slice')`, une
 * page blanche, et aucune indication de ce qu'il fallait faire.
 *
 * Le même appel se répète une vingtaine de fois dans les écrans
 * gestionnaire. La plupart n'accèdent pas à une méthode et ne plantent
 * donc pas : ils posent `undefined` dans l'état, ce qui laisse l'écran sur
 * « Chargement... » indéfiniment. C'est pire, en un sens — un plantage se
 * remarque, un chargement éternel se subit.
 *
 * ## Ce que fait cette fonction
 *
 * 1. **401 → retour à la connexion.** C'est la seule réponse utile à une
 *    session expirée : ni un plantage, ni un spinner perpétuel, mais
 *    « reconnectez-vous ». Une navigation dure (`location.href`) et non
 *    `router.push` : elle force un rendu serveur neuf, donc une
 *    revérification de session par `RoleGuardShell` — le routeur client
 *    pourrait resservir une page depuis son cache.
 * 2. **Toute autre réponse en échec, ou un corps illisible → `null`.** À
 *    l'appelant de choisir son repli ; il ne peut plus lire une propriété
 *    de `undefined`.
 *
 * Volontairement distincte de `lireReponse` : celle-ci sert aux ÉCRITURES,
 * où l'échec doit s'afficher dans le formulaire, pas renvoyer l'utilisateur
 * ailleurs au milieu d'une saisie.
 */
export async function chargerJson<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  let reponse: Response;
  try {
    reponse = await apiFetch(path, init);
  } catch {
    return null;
  }

  if (reponse.status === 401 && typeof window !== "undefined") {
    // `replace` plutôt que `href` : la page dont la session vient
    // d'expirer n'a pas à rester dans l'historique, le bouton « retour »
    // y ramènerait pour rien.
    window.location.replace("/connexion");
    return null;
  }
  if (!reponse.ok) return null;

  try {
    return (await reponse.json()) as T;
  } catch {
    return null;
  }
}
