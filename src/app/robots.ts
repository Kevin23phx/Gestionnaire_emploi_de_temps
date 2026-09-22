import type { MetadataRoute } from "next";

/**
 * [V8, 2026-09-21] robots.txt.
 *
 * Ce qui compte ici est autant ce qui N'Y EST PAS : **l'espace Admin n'y
 * est pas mentionné**. L'y interdire par une ligne « Disallow » aurait eu
 * l'effat exactement inverse de celui recherché — robots.txt est un fichier
 * public, et c'est le premier que lit quiconque cartographie un site :
 * chaque chemin qu'on y interdit est un chemin qu'on y publie. L'espace
 * Admin reste donc invisible ici, et porte sa propre instruction
 * `noindex` dans l'en-tête de ses pages (src/app/admin/layout.tsx).
 *
 * Ce qui est interdit, ce sont les pages sans intérêt pour un moteur et
 * dont l'adresse n'a de toute façon rien de secret : les formulaires de
 * connexion et d'activation. Tout le reste — la recherche de programme,
 * les feuilles de programme — a vocation à être trouvé : c'est même le but
 * du site (FR-PUB-01).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/connexion", "/activation", "/apres-connexion"],
    },
  };
}
