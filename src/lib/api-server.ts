/**
 * Variante de `apiFetch` pour les Server Components. `credentials: "include"`
 * n'existe pas côté serveur (pas de navigateur) : le cookie de session doit
 * être lu depuis la requête entrante (`next/headers`) et retransmis
 * explicitement en en-tête `Cookie` sur l'appel vers le backend.
 *
 * L'adresse utilisée ici est celle de la boucle locale (voir `apiBaseUrl` dans
 * api.ts) : le rendu a lieu sur le serveur, qui joint le backend directement,
 * sans passer par l'hôte que le visiteur a tapé dans sa barre d'adresse. C'est
 * aussi ce qui fait que le rendu serveur fonctionne que la page soit demandée
 * en `localhost` ou par l'IP du réseau.
 */
import { cookies } from "next/headers";
import { apiUrl } from "./api";

export async function apiFetchServer(path: string, init: RequestInit = {}): Promise<Response> {
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return fetch(apiUrl(path), {
    ...init,
    headers: { ...init.headers, Cookie: cookieHeader },
    cache: "no-store",
  });
}
