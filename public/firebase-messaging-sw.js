/* Ejby IF Bødekasse — FCM baggrunds-service-worker.
   SEPARAT fra /sw.js. Håndterer push-notifikationer fra Firebase Cloud
   Messaging når appen er lukket eller i baggrunden.

   Den offentlige Firebase-config sendes med som query-parametre når
   service-workeren registreres (se src/lib/messaging.ts), så vi slipper
   for at hardcode nøgler i denne fil. */

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);

// Læs den offentlige config fra service-workerens URL.
const params = new URL(self.location).searchParams;
const firebaseConfig = {
  apiKey: params.get("apiKey") || undefined,
  authDomain: params.get("authDomain") || undefined,
  projectId: params.get("projectId") || undefined,
  storageBucket: params.get("storageBucket") || undefined,
  messagingSenderId: params.get("messagingSenderId") || undefined,
  appId: params.get("appId") || undefined,
};

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Vis baggrunds-notifikationer. FCM-data-payloads sendes med en `notification`-
  // del fra serveren, men vi understøtter også rene data-beskeder.
  messaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {};
    const data = payload.data || {};
    const title = n.title || data.title || "Ejby Bødekasse";
    const options = {
      body: n.body || data.body || "",
      icon: data.icon || "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [100, 50, 100],
      // Samme tag erstatter en tidligere notifikation (fx påmindelser stacker ikke).
      tag: data.tag || undefined,
      renotify: data.tag ? true : undefined,
      data: { url: data.url || "/" },
    };
    self.registration.showNotification(title, options);
  });
}

// Åbn/fokusér appen når brugeren klikker på en notifikation.
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
