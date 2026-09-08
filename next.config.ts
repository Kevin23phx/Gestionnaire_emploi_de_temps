import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Autorise le chargement des ressources de dev (JS, HMR) quand l'appli est
  // ouverte depuis l'IP locale (téléphone sur le même Wi-Fi) plutôt que
  // "localhost" — sans ça, Next.js bloque ces requêtes et la page ne
  // s'hydrate jamais (les formulaires retombent sur un envoi HTML classique).
  allowedDevOrigins: ["10.17.215.195"],
};

export default nextConfig;
