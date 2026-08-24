/**
 * Point de bascule unique vers l'API réelle (NestJS, dépôt `backend/`) —
 * remplace les anciennes routes mock `src/app/api/**`. Utilisable depuis les
 * Client Components uniquement (utilise `fetch` + `credentials: "include"` :
 * frontend et backend ne sont plus la même origine, le cookie de session
 * opaque du backend doit être explicitement transmis à chaque requête).
 * Pour les Server Components, voir `api-server.ts` (transmission manuelle du
 * cookie entrant, `next/headers` n'est pas utilisable ici).
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(apiUrl(path), { ...init, credentials: "include" });
}
