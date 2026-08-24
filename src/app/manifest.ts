import type { MetadataRoute } from "next";

// NFR-DATA-01 / FR-OFF-* : app installable, légère, pensée pour Android d'entrée de gamme.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Campus Manager — UJKZ",
    short_name: "Campus Manager",
    description:
      "Gestion en temps réel des emplois du temps universitaires — Université Joseph Ki-Zerbo",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#0F2E5C",
    lang: "fr",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
