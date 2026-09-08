"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // [V3] Enregistré aussi en développement depuis que le Service Worker
    // porte les alertes Web Push (FR-PUB-08) : sans lui, l'abonnement aux
    // alertes est impossible à essayer autrement qu'en production.
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Échec silencieux : l'app reste utilisable en ligne, seul le mode hors-ligne est indisponible.
    });
  }, []);

  return null;
}
