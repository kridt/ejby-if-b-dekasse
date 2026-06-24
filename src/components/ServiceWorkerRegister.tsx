"use client";

import { useEffect } from "react";

/** Registrerer service worker så appen kan installeres som PWA.
 *  Selv-helende: når en ny service worker tager over, genindlæses siden én gang,
 *  så brugeren altid får den nyeste version efter et deploy. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Hvis der allerede er en aktiv controller, betyder en controllerchange
    // at en NY version har taget over -> genindlæs for at hente friskt indhold.
    let refreshing = false;
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        // Tjek altid efter en nyere service worker ved load.
        reg.update();
      })
      .catch((err) => console.error("SW registrering fejlede:", err));
  }, []);

  return null;
}
