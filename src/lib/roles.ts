import type { Role } from "./types";

// Utilitaire sans dépendance serveur (utilisable dans les Client Components),
// séparé de session.ts qui dépend de next/headers.
//
// [V3] Deux rôles seulement : les espaces /etudiant et /enseignant ont été
// supprimés avec les comptes correspondants. La consultation d'un programme
// se fait désormais à la racine du site, sans connexion (FR-PUB-01).
export function accueilPourRole(role: Role): string {
  switch (role) {
    case "scolarite":
      return "/scolarite";
    case "admin":
      return "/admin";
  }
}
