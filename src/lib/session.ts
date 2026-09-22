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
  // [V8] L'appel est enveloppé : un backend injoignable faisait remonter
  // l'exception de `fetch` jusqu'au rendu, donc une page d'erreur 500.
  //
  // C'était un défaut d'expérience partout — un gestionnaire voyait une
  // erreur serveur au lieu d'être renvoyé vers la connexion — mais c'était
  // surtout une FUITE depuis que l'espace Admin se dissimule : son chemin
  // non annoncé répondait 500 quand le backend était à l'arrêt, là où une
  // adresse inexistante répondait 404. La différence suffisait à confirmer
  // l'existence du chemin à qui le devinait, ce que NFR-SEC-04 interdit
  // précisément.
  //
  // « Pas de session » est de toute façon la lecture juste d'un backend
  // muet : on ne sait pas qui est l'utilisateur, donc on ne lui accorde
  // rien.
  try {
    const reponse = await apiFetchServer("/auth/me");
    if (!reponse.ok) return null;
    return (await reponse.json()) as Session;
  } catch {
    return null;
  }
}
