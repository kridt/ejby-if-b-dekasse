"use client";

import { useEffect } from "react";

/** Registrerer service worker så appen kan installeres som PWA. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => console.error("SW registrering fejlede:", err));
  }, []);

  return null;
}
