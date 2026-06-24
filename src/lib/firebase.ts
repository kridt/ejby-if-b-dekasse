// Firebase initialisering for Ejby IF Bødekasse
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// Hvis nøglerne mangler (fx env-variabler ikke sat i Vercel), så lad være med at
// crashe under build/prerender. getAuth() kaster ved tom apiKey, så vi bruger en
// pladsholder hvis den mangler. Appen virker først rigtigt når de rigtige
// NEXT_PUBLIC_FIREBASE_*-variabler er sat.
if (!apiKey && typeof window !== "undefined") {
  console.error(
    "Firebase: NEXT_PUBLIC_FIREBASE_*-variabler mangler. Tilføj dem i .env.local (lokalt) eller i Vercel → Project → Settings → Environment Variables."
  );
}

const firebaseConfig = {
  apiKey: apiKey || "missing-firebase-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Undgå at re-initialisere ved hot-reload
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export default app;
