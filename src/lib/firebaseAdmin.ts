// Server-side Firebase Admin SDK for Ejby IF Bødekasse.
// LAZY init: rør aldrig env eller credentials på modul-niveau, så `next build`
// kan prerendere uden hemmeligheder. Kald getAdmin() inde i route-handlere.
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

interface AdminBundle {
  app: App;
  auth: Auth;
  db: Firestore;
  messaging: Messaging;
}

let cached: AdminBundle | null = null;

/**
 * Initialiserer (eller genbruger) Firebase Admin ud fra en base64-kodet
 * service-account JSON i FIREBASE_SERVICE_ACCOUNT. Kaster en tydelig fejl
 * hvis variablen mangler — men KUN når den faktisk kaldes (ikke ved build).
 */
export function getAdmin(): AdminBundle {
  if (cached) return cached;

  const app = getApps().length ? getApp() : initApp();
  cached = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    messaging: getMessaging(app),
  };
  return cached;
}

function initApp(): App {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT mangler. Sæt den til base64 af en service-account JSON (se PHASE2-SETUP.md)."
    );
  }

  let json: { project_id?: string; client_email?: string; private_key?: string };
  try {
    json = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT kunne ikke afkodes. Den skal være base64 af en gyldig service-account JSON."
    );
  }

  if (!json.project_id || !json.client_email || !json.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT mangler felter (project_id/client_email/private_key).");
  }

  return initializeApp({
    credential: cert({
      projectId: json.project_id,
      clientEmail: json.client_email,
      // PEM-nøgler kan have escaped newlines når de pakkes i JSON/env.
      privateKey: json.private_key.replace(/\\n/g, "\n"),
    }),
  });
}
