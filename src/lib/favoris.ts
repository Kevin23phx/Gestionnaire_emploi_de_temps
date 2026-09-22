/**
 * [V3] FR-PUB-04 — favoris du visiteur, dans le stockage local de SON
 * appareil.
 *
 * Rien n'est envoyé au serveur, volontairement : sans compte, un favori
 * côté serveur supposerait un identifiant d'appareil, donc une forme de
 * suivi, pour un service que le navigateur rend déjà. La contrepartie est
 * assumée et doit être dite à l'utilisateur : changer de téléphone ou vider
 * son navigateur efface ses favoris.
 *
 * Tous les accès passent par un try/catch : `localStorage` lève dans
 * plusieurs situations réelles (navigation privée sur certains navigateurs,
 * stockage désactivé, quota atteint). Un favori qui ne peut pas être
 * enregistré ne doit jamais empêcher de consulter un programme.
 */
import { useSyncExternalStore } from "react";

import type { Favori } from "./types";

const CLE = "campus-manager.favoris";

export function lireFavoris(): Favori[] {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return [];
    const valeur = JSON.parse(brut);
    return Array.isArray(valeur) ? (valeur as Favori[]) : [];
  } catch {
    return [];
  }
}

function ecrire(favoris: Favori[]): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(favoris));
  } catch {
    // Silencieux à dessein — voir l'en-tête.
  }
  notifier();
}

// [V8.1] LIMITE ASSUMÉE : un favori reste identifié par le seul
// `groupeId`. Mettre en favori « L2 Médecine — Chimie » alors que « L2
// Médecine — Informatique » l'est déjà REMPLACE le premier au lieu de
// s'ajouter.
//
// C'est le comportement voulu dans le cas normal — un étudiant suit une
// spécialité, pas deux, et son favori doit suivre s'il se trompe puis se
// corrige. Le cas d'un visiteur qui voudrait garder deux vues du même
// groupe (un délégué, un enseignant) n'est pas couvert ; il faudrait pour
// cela une clé composite (groupeId + spécialité), et personne ne l'a
// demandé.
export function estFavori(groupeId: string): boolean {
  return lireFavoris().some((f) => f.groupeId === groupeId);
}

export function ajouterFavori(favori: Favori): Favori[] {
  const favoris = lireFavoris().filter((f) => f.groupeId !== favori.groupeId);
  const suivants = [favori, ...favoris];
  ecrire(suivants);
  return suivants;
}

export function retirerFavori(groupeId: string): Favori[] {
  const suivants = lireFavoris().filter((f) => f.groupeId !== groupeId);
  ecrire(suivants);
  return suivants;
}


// ---------------------------------------------------------------------------
// Abonnement React
// ---------------------------------------------------------------------------
// `useSyncExternalStore` plutôt qu'un `useEffect(() => setFavoris(lire()))` :
// le stockage local est un état extérieur à React, et c'est exactement ce que
// cette API existe pour brancher. Les deux autres approches sont fausses ici —
// lire dans l'initialiseur de `useState` fait diverger le HTML serveur (vide)
// du premier rendu client (rempli), donc une erreur d'hydratation ; lire dans
// un effet déclenche un rendu en cascade à chaque montage. `useSyncExternalStore`
// distingue nativement l'instantané serveur de l'instantané client.
//
// L'écouteur "storage" fait suivre les onglets entre eux : ajouter un favori
// dans l'un le fait apparaître dans l'autre sans rechargement.

const abonnes = new Set<() => void>();
let instantane: Favori[] = [];
let instantaneBrut: string | null = null;

function notifier(): void {
  abonnes.forEach((cb) => cb());
}

function souscrire(cb: () => void): () => void {
  abonnes.add(cb);
  if (abonnes.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", notifier);
  }
  return () => {
    abonnes.delete(cb);
    if (abonnes.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", notifier);
    }
  };
}

// `getSnapshot` doit renvoyer une valeur STABLE par référence tant que rien
// n'a changé, sinon React boucle indéfiniment. D'où la comparaison sur la
// chaîne brute plutôt que sur le tableau reconstruit à chaque appel.
function instantaneClient(): Favori[] {
  let brut: string | null = null;
  try {
    brut = localStorage.getItem(CLE);
  } catch {
    brut = null;
  }
  if (brut !== instantaneBrut) {
    instantaneBrut = brut;
    instantane = lireFavoris();
  }
  return instantane;
}

const INSTANTANE_SERVEUR: Favori[] = [];

export function useFavoris(): Favori[] {
  return useSyncExternalStore(souscrire, instantaneClient, () => INSTANTANE_SERVEUR);
}

export function useEstFavori(groupeId: string): boolean {
  return useFavoris().some((f) => f.groupeId === groupeId);
}
