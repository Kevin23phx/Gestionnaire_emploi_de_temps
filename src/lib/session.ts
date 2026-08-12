/**
 * Session — implémentation mock côté frontend (cookie signé absent : à durcir
 * côté backend avec de vrais JWT/sessions serveur, cf. README "Contrat API").
 * Sert de point de bascule unique : le jour où l'API NestJS est prête, seul ce
 * fichier (et les routes app/api/auth/*) doit changer, pas les pages.
 */
import { cookies } from "next/headers";
import type { Role } from "./types";

export const SESSION_COOKIE = "cm_session";

export interface Session {
  userId: string;
  role: Role;
  nom: string;
  prenom: string;
  // FR-EDT-04/05/06 : périmètre de lecture propre au compte (RBAC).
  groupeId?: string;
  enseignantId?: string;
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}
