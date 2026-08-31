/**
 * Session — lit l'identité via le backend réel (GET /auth/me), plus une
 * simple valeur locale décodée. Le cookie `cm_session` est désormais opaque
 * (émis par le backend, valeur aléatoire signée côté serveur) : ce fichier
 * ne peut donc plus le décoder lui-même, contrairement à l'ancienne version
 * mock qui y stockait un JSON en clair.
 */
import { apiFetchServer } from "./api-server";
import type { Role } from "./types";

export const SESSION_COOKIE = "cm_session";

export interface Session {
  nom: string;
  prenom: string;
  role: Role;
  // Gestionnaire de scolarité uniquement (INV-10) — jamais renseigné pour
  // un Admin ni un Étudiant/Enseignant.
  ufrId?: string | null;
}

export async function getSession(): Promise<Session | null> {
  const reponse = await apiFetchServer("/auth/me");
  if (!reponse.ok) return null;
  return (await reponse.json()) as Session;
}
