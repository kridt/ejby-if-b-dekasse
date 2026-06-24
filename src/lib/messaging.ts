// Firebase Cloud Messaging (FCM) på klienten for Ejby IF Bødekasse.
// Håndterer registrering af push-token og forgrunds-beskeder.
// ALT er SSR-sikkert: intet kører på serveren, og vi tjekker isSupported().
"use client";

import { arrayRemove, arrayUnion, doc, updateDoc } from "firebase/firestore";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from "firebase/messaging";
import app, { db } from "./firebase";

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/** Resultattyper for at vise den rigtige danske tilstand i UI'et. */
export type PushResult =
  | "enabled" // token gemt
  | "denied" // brugeren har blokeret notifikationer
  | "unsupported" // browseren/enheden understøtter ikke push
  | "no-vapid" // VAPID-nøgle mangler i miljøet
  | "error"; // uventet fejl

let messagingPromise: Promise<Messaging | null> | null = null;

/** Henter en Messaging-instans hvis browseren understøtter det (ellers null). */
async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return null;
  if (!messagingPromise) {
    messagingPromise = (async () => {
      try {
        if (!(await isSupported())) return null;
        return getMessaging(app);
      } catch (err) {
        console.warn("FCM understøttes ikke:", err);
        return null;
      }
    })();
  }
  return messagingPromise;
}

/** Hurtigt tjek af om push overhovedet kan bruges her. */
export async function pushSupported(): Promise<boolean> {
  return (await getMessagingIfSupported()) !== null;
}

/** Nuværende notifikationstilladelse, eller "unsupported". */
export function currentPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Beder om notifikationstilladelse, henter et FCM-token og gemmer det i
 * brugerens Firestore-dokument under `fcmTokens` (arrayUnion, så flere
 * enheder kan registreres). Returnerer en PushResult til UI'et.
 */
export async function requestAndSaveToken(uid: string): Promise<PushResult> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return "unsupported";
  if (!vapidKey) {
    console.warn("NEXT_PUBLIC_FIREBASE_VAPID_KEY mangler — kan ikke hente push-token.");
    return "no-vapid";
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    // Sørg for at FCM-service-workeren er registreret før vi henter token.
    // Vi sender den offentlige Firebase-config med som query-parametre, så
    // service-workeren kan initialisere uden hardcodede nøgler.
    let swReg: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator) {
      const params = new URLSearchParams({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
      });
      swReg = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${params.toString()}`,
        { scope: "/" }
      );
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });
    if (!token) return "error";

    await updateDoc(doc(db, "users", uid), {
      fcmTokens: arrayUnion(token),
    });
    return "enabled";
  } catch (err) {
    console.error("Kunne ikke aktivere notifikationer:", err);
    return "error";
  }
}

/** Fjerner et token fra brugerens dokument (fx ved afmelding). */
export async function removeToken(uid: string, token: string): Promise<void> {
  try {
    await updateDoc(doc(db, "users", uid), { fcmTokens: arrayRemove(token) });
  } catch (err) {
    console.warn("Kunne ikke fjerne push-token:", err);
  }
}

/**
 * Lytter efter beskeder mens appen er i forgrunden. Returnerer en
 * unsubscribe-funktion (eller en no-op hvis push ikke understøttes).
 */
export async function onForegroundMessage(
  handler: (payload: MessagePayload) => void
): Promise<() => void> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
}
