/**
 * Variante de `apiFetch` pour les Server Components. `credentials: "include"`
 * n'existe pas côté serveur (pas de navigateur) : le cookie de session doit
 * être lu depuis la requête entrante (`next/headers`) et retransmis
 * explicitement en en-tête `Cookie` sur l'appel vers le backend.
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
