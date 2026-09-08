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

// [V3] FR-PUB-08 — réception des alertes Web Push.
//
// C'est le seul canal réellement immédiat qui reste depuis la disparition
// des comptes : l'agenda personnel, lui, est relu au rythme du fournisseur
// (plusieurs heures chez Google), ce qui ne peut pas porter la promesse
// « moins d'une minute » du cahier des charges (FR-NOTIF-05).
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let charge;
  try {
    charge = event.data.json();
  } catch {
    // Une charge illisible ne doit pas faire échouer l'événement — mieux
    // vaut une notification générique que rien du tout.
    charge = { titre: "Campus Manager", corps: "Votre programme a changé." };
  }

  event.waitUntil(
    self.registration.showNotification(charge.titre ?? "Campus Manager", {
      body: charge.corps ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Regroupe par groupe : trois changements sur le même programme ne
      // doivent pas produire trois notifications empilées.
      tag: charge.groupeId ? `programme-${charge.groupeId}` : "campus-manager",
      renotify: true,
      data: { groupeId: charge.groupeId },
    })
  );
});

// Ouvrir la notification ramène au programme concerné, pas à l'accueil :
// l'utilisateur veut voir CE qui a changé, pas refaire une recherche.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const groupeId = event.notification.data && event.notification.data.groupeId;
  const cible = groupeId ? `/programme/${groupeId}` : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const fenetre of fenetres) {
        if (fenetre.url.includes(cible) && "focus" in fenetre) return fenetre.focus();
      }
      return self.clients.openWindow(cible);
    })
  );
});
