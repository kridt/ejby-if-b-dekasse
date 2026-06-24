"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "ejby-install-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ rapporterer som Mac med touch
  const iPadOS = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

/** Diskret A2HS-banner. Viser native-prompt (Android/desktop) eller iOS-vejledning. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari sender ikke beforeinstallprompt — vis manuel vejledning.
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) {
      iosTimer = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 1500);
    }

    function onInstalled() {
      setVisible(false);
      setDeferred(null);
    }
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignorér (privat tilstand mm.)
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto w-full max-w-md px-4">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-lg">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
            <path d="M5 21h14" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Installér Ejby Bødekasse</p>
          {iosHint ? (
            <p className="mt-0.5 text-xs text-muted">
              Tryk på <span className="font-semibold text-foreground">Del</span> og vælg{" "}
              <span className="font-semibold text-foreground">Føj til hjemmeskærm</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted">
              Få appen på din hjemmeskærm for hurtig adgang.
            </p>
          )}
          {!iosHint && (
            <div className="mt-2.5 flex gap-2">
              <Button onClick={install} className="px-3 py-1.5 text-xs">
                Installér
              </Button>
              <Button variant="ghost" onClick={dismiss} className="px-3 py-1.5 text-xs">
                Ikke nu
              </Button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Luk installations-banner"
          className="-m-1 rounded-lg p-1 text-muted transition hover:text-foreground"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
