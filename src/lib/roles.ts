import type { Role } from "./types";

// Utilitaire sans dépendance serveur (utilisable dans les Client Components),
// séparé de session.ts qui dépend de next/headers.
export function accueilPourRole(role: Role): string {
  switch (role) {
    case "etudiant":
      return "/etudiant";
    case "enseignant":
      return "/enseignant";
    case "scolarite":
      return "/scolarite";
    case "admin":
      return "/admin";
  }
}
