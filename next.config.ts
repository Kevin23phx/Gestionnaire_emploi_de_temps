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

// Recopie exacte des valeurs de `public/_headers` : une seule politique,
// deux points de livraison. Toute évolution doit toucher les deux, sans
// quoi fichiers et pages divergeraient en silence.
//
// `'unsafe-inline'` sur script-src et style-src : Next pose le script
// d'hydratation et les styles critiques en ligne, sans nonce. Les retirer
// donnerait une page blanche.
// `connect-src 'self' https:` : les appels d'API passent par notre propre
// domaine (cf. `rewrites` plus bas), `https:` couvre l'abonnement aux
// notifications push.
const EN_TETES_SECURITE = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "manifest-src 'self'",
      "worker-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

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

  // [V8.8, 2026-09-23] Mêmes en-têtes de sécurité que `public/_headers`,
  // mais posés ICI — sans quoi ils ne couvrent pas les pages.
  //
  // `_headers` n'est lu que par la couche qui sert les FICHIERS (bundles,
  // images, manifeste). Les pages, elles, sont fabriquées par le worker,
  // qui construit sa réponse et la renvoie sans passer par cette couche :
  // son `/*` protégeait donc le JavaScript — qui n'en a guère besoin — et
  // laissait à découvert le HTML, seule cible réelle du clickjacking, de la
  // confusion de type et de l'injection que ces en-têtes visent.
  //
  // Les deux déclarations coexistent : `_headers` garde le cache long des
  // fichiers statiques, que Next ne gère pas.
  async headers() {
    return [{ source: "/:path*", headers: EN_TETES_SECURITE }];
  },
};

export default nextConfig;

// Donne à `next dev` accès aux bindings Cloudflare définis dans wrangler.jsonc
// (aucun pour l'instant) — sans effet en dehors du mode dev.
initOpenNextCloudflareForDev();
