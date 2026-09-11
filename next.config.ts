import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// Autorise le chargement des ressources de dev (JS, HMR) quand l'appli est
// ouverte depuis une adresse autre que "localhost" — typiquement un téléphone
// sur le même Wi-Fi. Sans ça, Next.js bloque ces requêtes et la page ne
// s'hydrate jamais (les formulaires retombent sur un envoi HTML classique).
//
// Les adresses sont DÉTECTÉES au démarrage plutôt qu'écrites en dur : une IP
// de réseau local est attribuée par DHCP et change de box en box, de campus à
// domicile. Une valeur figée fonctionne le jour où on l'écrit et casse la
// semaine suivante, avec un symptôme (page qui ne réagit plus) sans rapport
// visible avec la cause.
function adressesLocales(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((interfaces) => interfaces ?? [])
    .filter((i) => i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: adressesLocales(),
};

export default nextConfig;
