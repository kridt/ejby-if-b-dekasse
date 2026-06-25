"use client";

// Global installations-prompt. Drives udelukkende af usePwa()-storen.
//  - Android/desktop: slankt afviseligt bund-banner med native "Installér".
//  - iOS Safari (iOS 26-flow): instruktivt bund-ark — ••• → Del → Føj til
//    hjemmeskærm — med ikoner inline (ingen fast pil, da adresselinjen kan stå
//    øverst eller nederst).
//  - iOS in-app webview (Facebook/Instagram m.fl.): "Åbn i Safari" + kopiér link.
// Vises aldrig når appen allerede kører standalone.

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { ClubLogo } from "@/components/ClubLogo";
import { useToast } from "@/components/Toast";
import { fireConfetti } from "@/components/Celebrate";
import { usePwa } from "@/hooks/usePwa";

// Ruter hvor vi aldrig forstyrrer med install-ark (login/oprettelse).
const AUTH_ROUTES = ["/login", "/signup"];

// Hydration-sikker "er vi på klienten?"-hook uden setState-i-effect.
const emptySubscribe = () => () => {};
function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // klient-snapshot
    () => false // server-snapshot
  );
}

export function InstallPrompt() {
  const pathname = usePathname();
  const { success } = useToast();

  const isIOS = usePwa((s) => s.isIOS);
  const isStandalone = usePwa((s) => s.isStandalone);
  const isSafari = usePwa((s) => s.isSafari);
  const isInAppBrowser = usePwa((s) => s.isInAppBrowser);
  const canInstall = usePwa((s) => s.canInstall);
  const dismissedAt = usePwa((s) => s.dismissedAt);
  const install = usePwa((s) => s.install);
  const dismiss = usePwa((s) => s.dismiss);
  const dismissedRecently = usePwa((s) => s.dismissedRecently);

  // Undgå hydration-mismatch: render intet før vi er på klienten.
  const mounted = useIsClient();

  // appinstalled → fejr + toast (uanset platform).
  useEffect(() => {
    function onInstalled() {
      fireConfetti();
      success("Appen er installeret! 🎉");
    }
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, [success]);

  if (!mounted || isStandalone) return null;
  // dismissedAt læses så storen er abonneret; afvist for nylig → skjul.
  void dismissedAt;
  const recentlyDismissed = dismissedRecently();

  const onAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // iOS in-app webview: kan ikke installeres — bed om at åbne i Safari.
  if (isIOS && isInAppBrowser && !onAuthRoute && !recentlyDismissed) {
    return <InAppBrowserNotice onClose={dismiss} />;
  }

  // iOS Safari: instruktivt ark.
  if (isIOS && isSafari && !isInAppBrowser && !onAuthRoute && !recentlyDismissed) {
    return <IosInstallSheet onClose={dismiss} />;
  }

  // Android/desktop: native prompt tilgængeligt.
  if (canInstall && !recentlyDismissed) {
    return <AndroidBanner onInstall={install} onDismiss={dismiss} />;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Android / desktop banner
// ---------------------------------------------------------------------------
function AndroidBanner({
  onInstall,
  onDismiss,
}: {
  onInstall: () => Promise<boolean>;
  onDismiss: () => void;
}) {
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState(false);

  async function handleInstall() {
    setBusy(true);
    try {
      await onInstall();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto w-full max-w-md px-4"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
        transition={{ duration: reduce ? 0.15 : 0.28 }}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-lg">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DownloadIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Installér Ejby Bødekasse</p>
            <p className="mt-0.5 truncate text-xs text-muted">
              Få appen på din hjemmeskærm for hurtig adgang.
            </p>
          </div>
          <Button onClick={handleInstall} loading={busy} className="shrink-0 px-3 py-1.5 text-xs">
            Installér
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Luk installations-banner"
            className="-m-1 shrink-0 rounded-lg p-1 text-muted transition hover:text-foreground"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// iOS Safari install-ark
// ---------------------------------------------------------------------------
function IosInstallSheet({ onClose }: { onClose: () => void }) {
  const reduce = useReducedMotion();

  // iOS 26-flow: Safari har ikke længere en synlig Del-knap — man åbner ••• -menuen
  // (til højre i adresselinjen) → Del → Føj til hjemmeskærm. Vi viser ikonerne
  // inline i stedet for en fast pil, da adresselinjen kan stå øverst eller nederst.
  const steps = [
    {
      n: "1",
      label: (
        <>
          Tryk på <span className="font-semibold text-foreground">•••</span> til højre i adresselinjen
        </>
      ),
      icon: <MoreIcon className="size-5" />,
    },
    {
      n: "2",
      label: (
        <>
          Vælg <span className="font-semibold text-foreground">Del</span>
        </>
      ),
      icon: <ShareIcon className="size-5" />,
    },
    {
      n: "3",
      label: (
        <>
          Vælg <span className="font-semibold text-foreground">«Føj til hjemmeskærm»</span>
        </>
      ),
      icon: <AddToHomeIcon className="size-5" />,
    },
    {
      n: "4",
      label: (
        <>
          Tryk <span className="font-semibold text-foreground">«Tilføj»</span>
        </>
      ),
      icon: <CheckIcon className="size-5" />,
    },
  ];

  return (
    <Sheet open onClose={onClose} title="Føj Bødekassen til hjemmeskærmen">
      <div className="mb-4 flex items-center gap-3">
        <ClubLogo size={48} />
        <p className="text-sm text-muted">
          Installér appen, så har du altid bøderne lige ved hånden — og kan få notifikationer.
        </p>
      </div>

      <ol className="space-y-2.5">
        {steps.map((step, i) => (
          <motion.li
            key={step.n}
            className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { delay: 0.05 * i, duration: 0.25 }}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {step.n}
            </span>
            <span className="flex-1 text-sm">{step.label}</span>
            <span className="text-primary" aria-hidden="true">
              {step.icon}
            </span>
          </motion.li>
        ))}
      </ol>

      <p className="mt-3 text-xs text-muted">
        På ældre iPhones kan du trykke direkte på <span className="font-semibold text-foreground">Del</span>-ikonet i værktøjslinjen.
      </p>

      <Button variant="secondary" className="mt-3 w-full" onClick={onClose}>
        Senere
      </Button>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// iOS in-app webview (Facebook/Instagram) — kan ikke installeres
// ---------------------------------------------------------------------------
function InAppBrowserNotice({ onClose }: { onClose: () => void }) {
  const { success, error } = useToast();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      success("Link kopieret — indsæt det i Safari.");
    } catch {
      error("Kunne ikke kopiere linket. Kopiér adressen manuelt.");
    }
  }

  return (
    <Sheet open onClose={onClose} title="Åbn i Safari for at installere">
      <div className="mb-4 flex items-center gap-3">
        <ClubLogo size={48} />
        <p className="text-sm text-muted">
          Du ser appen i en in-app-browser. For at installere på hjemmeskærmen skal du åbne
          siden i <span className="font-semibold text-foreground">Safari</span>.
        </p>
      </div>
      <ol className="mb-4 space-y-2.5">
        <li className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            1
          </span>
          <span className="flex-1">Tryk på menuen (•••) og vælg «Åbn i Safari»</span>
        </li>
        <li className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            2
          </span>
          <span className="flex-1">…eller kopiér linket og indsæt det i Safari</span>
        </li>
      </ol>
      <Button className="w-full" onClick={copyLink}>
        Kopiér link
      </Button>
      <Button variant="secondary" className="mt-2 w-full" onClick={onClose}>
        Senere
      </Button>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Ikoner
// ---------------------------------------------------------------------------
type IconProps = { className?: string };

function DownloadIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
      <path d="M5 21h14" />
    </svg>
  );
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function MoreIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function ShareIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4m0 0L8 8m4-4l4 4" />
      <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

function AddToHomeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
