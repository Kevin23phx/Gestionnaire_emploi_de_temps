import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

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

// Backend distant (Render) en production — absent en dev, où le backend
// tourne en local et n'a besoin d'aucun relais (voir src/lib/api.ts).
const BACKEND_DISTANT = process.env.API_INTERNAL_URL?.trim();

const nextConfig: NextConfig = {
  allowedDevOrigins: adressesLocales(),
  // Relaie /api/* vers le backend distant, SUR NOTRE PROPRE DOMAINE du point
  // de vue du navigateur — condition nécessaire pour que le cookie de
  // session se pose sur notre domaine plutôt que sur celui du backend (cf.
  // le commentaire en tête de src/lib/api.ts pour le pourquoi complet).
  async rewrites() {
    if (!BACKEND_DISTANT) return [];
    return [{ source: "/api/:path*", destination: `${BACKEND_DISTANT}/:path*` }];
  },
};

export default nextConfig;

// Donne à `next dev` accès aux bindings Cloudflare définis dans wrangler.jsonc
// (aucun pour l'instant) — sans effet en dehors du mode dev.
initOpenNextCloudflareForDev();
