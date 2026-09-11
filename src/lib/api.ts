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
 * En production, `NEXT_PUBLIC_API_URL` reprend la main : l'API y vit sur un
 * autre domaine, et la déduction ci-dessus n'aurait plus de sens.
 */

// Renseigné en production uniquement (ex. https://api.campus.ujkz.bf/api).
// Laisser vide en développement pour bénéficier de la déduction dynamique.
const API_URL_EXPLICITE = process.env.NEXT_PUBLIC_API_URL?.trim();

// Port du backend. Django écoute sur 3001 par défaut (cf. backend_django/.env).
const API_PORT = process.env.NEXT_PUBLIC_API_PORT?.trim() || "3001";

// Utilisée par les Server Components (aucun `window` : le rendu se fait sur le
// serveur, qui joint le backend en local). Surchargeable pour un déploiement
// où les deux conteneurs ne partagent pas la boucle locale.
const API_URL_INTERNE = process.env.API_INTERNAL_URL?.trim() || `http://127.0.0.1:${API_PORT}/api`;

export function apiBaseUrl(): string {
  if (API_URL_EXPLICITE) return API_URL_EXPLICITE;
  if (typeof window === "undefined") return API_URL_INTERNE;
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
