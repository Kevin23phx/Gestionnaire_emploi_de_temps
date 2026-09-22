// Utilitaire sans dépendance serveur (utilisable dans les Client Components),
// séparé de session.ts qui dépend de next/headers.
//
// [V3] Deux rôles seulement : les espaces /etudiant et /enseignant ont été
// supprimés avec les comptes correspondants. La consultation d'un programme
// se fait désormais à la racine du site, sans connexion (FR-PUB-01).
//
// [V8, 2026-09-21] `accueilPourRole(role)` a disparu, et ce n'est pas un
// simple déplacement : cette fonction était du code CLIENT et faisait donc
// voyager la table des destinations — dont l'adresse de l'espace Admin —
// dans le bundle JavaScript servi à tous les visiteurs. Le formulaire de
// connexion ne connaît plus qu'une destination, la même pour tous les
// rôles ; c'est `src/app/apres-connexion/page.tsx` qui aiguille, côté
// serveur, à partir de la session réelle. Voir src/lib/espace-admin.ts.

/**
 * Où envoyer l'utilisateur juste après une connexion ou une activation
 * réussie. Identique pour tous les rôles, délibérément.
 */
export const CHEMIN_APRES_CONNEXION = "/apres-connexion";
