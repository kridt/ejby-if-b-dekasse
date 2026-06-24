/* Ejby IF Bødekasse — service worker
   Bevidst MINIMAL: gør appen installerbar (PWA) og håndterer push (Phase 2).
   Den cacher IKKE sider — det undgår "stale build"-problemer efter deploys. */

const CACHE_PREFIX = "ejby-bodekasse-";

self.addEventListener("install", () => {
  // Tag over med det samme, så nye versioner slår hurtigt igennem.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Ryd ALLE gamle caches (inkl. tidligere versioner der cachede HTML).
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith(CACHE_PREFIX)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Ingen fetch-caching: en tom handler er nok til at appen kan installeres,
// mens alt indhold altid hentes friskt fra netværket.
self.addEventListener("fetch", () => {});

// ===== Push-notifikationer (Phase 2) =====
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Ejby Bødekasse", body: event.data.text() };
  }
  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: { url: data.url || "/" },
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "Ejby Bødekasse", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
