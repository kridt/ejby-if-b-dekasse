"use client";

// Eneste sandhedskilde for PWA-installations- og standalone-tilstand.
// SSR-sikker: ingen window-adgang under render. Lyttere registreres ved
// modul-load (klient-beskyttet), så `beforeinstallprompt` — som kan fyre før
// hydrering — altid fanges og gemmes.

import { create } from "zustand";

/** Det native install-event (ikke i lib.dom endnu). */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "ejby-install-dismissed-at";
/** Gen-tilbyd installation efter ~14 dage. */
export const REOFFER_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

type PwaState = {
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  isSafari: boolean;
  isInAppBrowser: boolean;
  /** Har vi et brugbart native install-prompt (Android/desktop Chrome m.fl.)? */
  canInstall: boolean;
  /** Gemt beforeinstallprompt-event (eller null). */
  deferredPrompt: BeforeInstallPromptEvent | null;
  /** Tidsstempel (ms) for sidste afvisning, eller null. */
  dismissedAt: number | null;

  /** Udløser det native install-flow. Returnerer true hvis brugeren accepterede. */
  install: () => Promise<boolean>;
  /** Gemmer en afvisning med tidsstempel (localStorage). */
  dismiss: () => void;
  /** Sand hvis vi for nylig er blevet afvist (inden for gen-tilbuds-vinduet). */
  dismissedRecently: () => boolean;
};

// ---- Rene detektorer (kaldes kun på klienten) ----

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return mql || iosStandalone;
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const classic = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ melder sig som desktop-Mac, men har touch.
  const iPadOS = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return classic || iPadOS;
}

function detectAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function detectInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iOS in-app webviews (WKWebView) bærer ALTID "Safari/604.1"-token, så vi må
  // IKKE udelukke på Safari-substring — app-tokens er specifikke nok i sig selv.
  return /\bFBAN|\bFBAV|FBIOS|Instagram|\bLine\/|GSA\//i.test(ua);
}

function detectSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Ægte Safari: indeholder "Safari" men ikke andre motorer/in-app-mærker.
  return (
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android|FBAN|FBAV|Instagram|\bLine\//i.test(ua)
  );
}

function readDismissedAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export const usePwa = create<PwaState>((set, get) => ({
  // SSR-sikre defaults — opdateres af initPwa() på klienten.
  isIOS: false,
  isAndroid: false,
  isStandalone: false,
  isSafari: false,
  isInAppBrowser: false,
  canInstall: false,
  deferredPrompt: null,
  dismissedAt: null,

  install: async () => {
    const deferred = get().deferredPrompt;
    if (!deferred) return false;
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      // Et beforeinstallprompt-event kan kun bruges én gang.
      set({ deferredPrompt: null, canInstall: false });
      return outcome === "accepted";
    } catch {
      set({ deferredPrompt: null, canInstall: false });
      return false;
    }
  },

  dismiss: () => {
    const now = Date.now();
    try {
      window.localStorage.setItem(DISMISS_KEY, String(now));
    } catch {
      // privat tilstand mm. — ignorér
    }
    set({ dismissedAt: now });
  },

  dismissedRecently: () => {
    const at = get().dismissedAt;
    if (at == null) return false;
    return Date.now() - at < REOFFER_AFTER_MS;
  },
}));

/** Sætter/fjerner .standalone på <html> så CSS kan reagere. */
function syncStandaloneClass(standalone: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("standalone", standalone);
}

let initialized = false;

/**
 * Initialiserer detektorer + lyttere. Kaldes ved modul-load på klienten
 * (se nederst). Idempotent.
 */
function initPwa(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const standalone = detectStandalone();

  usePwa.setState({
    isIOS: detectIOS(),
    isAndroid: detectAndroid(),
    isStandalone: standalone,
    isSafari: detectSafari(),
    isInAppBrowser: detectInAppBrowser(),
    dismissedAt: readDismissedAt(),
  });
  syncStandaloneClass(standalone);

  // beforeinstallprompt kan fyre før React hydrerer — fang og gem den.
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    usePwa.setState({
      deferredPrompt: e as BeforeInstallPromptEvent,
      canInstall: true,
    });
  });

  // Når appen er installeret: ryd prompt og marker standalone.
  window.addEventListener("appinstalled", () => {
    usePwa.setState({
      deferredPrompt: null,
      canInstall: false,
      isStandalone: true,
    });
    syncStandaloneClass(true);
  });

  // Reager hvis visningstilstanden skifter (fx åbnet som installeret app).
  const mql = window.matchMedia?.("(display-mode: standalone)");
  const onChange = () => {
    const next = detectStandalone();
    usePwa.setState({ isStandalone: next });
    syncStandaloneClass(next);
  };
  // addEventListener findes på moderne browsere; addListener er fallback.
  if (mql) {
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
    } else if (typeof mql.addListener === "function") {
      mql.addListener(onChange);
    }
  }
}

// Kør ved modul-load på klienten, så event'et fanges så tidligt som muligt.
if (typeof window !== "undefined") {
  initPwa();
}
