// Service Worker minimal — FR-OFF-01 : met en cache le shell applicatif pour
// une consultation en lecture seule hors-ligne. Volontairement simple (pas de
// librairie tierce) pour rester prévisible sur une stack Next.js 16/Turbopack
// encore très récente ; à faire évoluer (stratégies par route, Web Push) une
// fois l'API backend branchée.
const CACHE_NAME = "campus-manager-shell-v1";
const SHELL_URLS = ["/", "/connexion", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

// Stratégie : réseau d'abord, repli sur le cache si hors-ligne (GET uniquement).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
