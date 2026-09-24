import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// [2026-09] Tests unitaires du frontend. Ils ne visent PAS les écrans
// (rendus, routage, appels réseau) : ceux-ci changent à chaque retour
// d'usage et des tests qui les figeraient coûteraient plus qu'ils ne
// rapportent. Ils visent la LOGIQUE PURE de `src/lib` — les fonctions qui
// décident, calculent et filtrent —, plus le proxy, qui porte une règle de
// sécurité (le masquage de l'espace Admin) qu'aucun test ne couvrait.
//
// Extension `.mts` : ce fichier est en syntaxe ESM, et Vite refusera bientôt
// de le charger comme du CommonJS (avertissement de Vite 8).
//
// `resolve.tsconfigPaths` pour que les imports `@/...` résolvent comme dans
// l'application — support natif de Vite, qui remplace le plugin dédié.
// `happy-dom` parce qu'une partie de cette logique lit `window` /
// `localStorage` (favoris, déduction de l'URL d'API).
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: true,
  },
});
