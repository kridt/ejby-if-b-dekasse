"use client";

// Varig hjælpe-side: altid tilgængelig vejledning til at få Bødekassen på
// hjemmeskærmen. Platform-forgrenet (iOS / Android / in-app webview) og
// reduceret-bevægelses-sikker. Authed rute → pakket i AppShell.

import { useState, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";
import { ClubLogo } from "@/components/ClubLogo";
import { useToast } from "@/components/Toast";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { usePwa } from "@/hooks/usePwa";

export default function InstallerPage() {
  return (
    <AppShell>
      <InstallerContent />
    </AppShell>
  );
}

function InstallerContent() {
  const reduce = useReducedMotion();

  const isIOS = usePwa((s) => s.isIOS);
  const isStandalone = usePwa((s) => s.isStandalone);
  const isInAppBrowser = usePwa((s) => s.isInAppBrowser);
  const canInstall = usePwa((s) => s.canInstall);
  const install = usePwa((s) => s.install);

  const container: Variants = {
    hidden: {},
    show: {
      transition: reduce ? {} : { staggerChildren: 0.07, delayChildren: 0.05 },
    },
  };

  return (
    <div>
      <motion.header
        className="mb-6 flex flex-col items-center text-center"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.3 }}
      >
        <ClubLogo size={72} />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
          Få Bødekassen på hjemmeskærmen
        </h1>
        <p className="mt-1.5 max-w-xs text-sm text-muted">
          Så åbner appen i fuld skærm — hurtigere adgang og mulighed for notifikationer.
        </p>
      </motion.header>

      {isStandalone ? (
        <InstalledCard />
      ) : isInAppBrowser ? (
        <InAppBrowserSteps container={container} reduce={!!reduce} />
      ) : isIOS ? (
        <IosSteps container={container} reduce={!!reduce} />
      ) : (
        <AndroidSteps
          container={container}
          reduce={!!reduce}
          canInstall={canInstall}
          install={install}
        />
      )}
    </div>
  );
}

// Variant for hvert trin (transform/opacity).
const stepVariant: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function StepList({
  container,
  reduce,
  children,
}: {
  container: Variants;
  reduce: boolean;
  children: ReactNode;
}) {
  return (
    <motion.ol
      className="space-y-2.5"
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="show"
    >
      {children}
    </motion.ol>
  );
}

function Step({
  n,
  reduce,
  children,
}: {
  n: number;
  reduce: boolean;
  children: ReactNode;
}) {
  return (
    <motion.li
      variants={reduce ? undefined : stepVariant}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {n}
      </span>
      <span className="flex-1 text-sm">{children}</span>
    </motion.li>
  );
}

// ---- Allerede installeret ----
function InstalledCard() {
  return (
    <Card className="flex flex-col items-center border-primary/30 bg-primary/5 px-6 py-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="mt-3 text-lg font-bold text-primary">Appen er installeret ✓</p>
      <p className="mt-1 text-sm text-muted">
        Du kører Bødekassen som app. Du kan nu aktivere notifikationer under «Min profil».
      </p>
    </Card>
  );
}

// ---- iOS ----
function IosSteps({ container, reduce }: { container: Variants; reduce: boolean }) {
  return (
    <>
      <StepList container={container} reduce={reduce}>
        <Step n={1} reduce={reduce}>
          Tryk på <span className="font-semibold text-foreground">•••</span> til højre i adresselinjen.
        </Step>
        <Step n={2} reduce={reduce}>
          Vælg <span className="font-semibold text-foreground">Del</span> <ShareGlyph />.
        </Step>
        <Step n={3} reduce={reduce}>
          Rul ned og vælg{" "}
          <span className="font-semibold text-foreground">«Føj til hjemmeskærm»</span>.
        </Step>
        <Step n={4} reduce={reduce}>
          Tryk <span className="font-semibold text-foreground">«Tilføj»</span>.
        </Step>
      </StepList>
      <p className="mt-4 text-center text-xs text-muted">
        Virker kun i Safari. På ældre iPhones kan du trykke direkte på Del-ikonet i værktøjslinjen.
      </p>
    </>
  );
}

function ShareGlyph() {
  return (
    <svg className="inline size-4 -translate-y-0.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4m0 0L8 8m4-4l4 4" />
      <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

// ---- Android / desktop ----
function AndroidSteps({
  container,
  reduce,
  canInstall,
  install,
}: {
  container: Variants;
  reduce: boolean;
  canInstall: boolean;
  install: () => Promise<boolean>;
}) {
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleInstall() {
    setBusy(true);
    try {
      const accepted = await install();
      if (accepted) success("Installerer Bødekassen…");
    } catch {
      error("Kunne ikke starte installationen. Prøv igen.");
    } finally {
      setBusy(false);
    }
  }

  if (canInstall) {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.3 }}
      >
        <Card className="flex flex-col items-center px-6 py-8 text-center">
          <p className="text-sm text-muted">
            Tryk på knappen for at installere Bødekassen som app på din enhed.
          </p>
          <Button className="mt-4 w-full" loading={busy} onClick={handleInstall}>
            Installér app
          </Button>
        </Card>
      </motion.div>
    );
  }

  // Intet native prompt tilgængeligt → vis manuel vejledning.
  return (
    <>
      <StepList container={container} reduce={reduce}>
        <Step n={1} reduce={reduce}>
          Åbn browserens menu{" "}
          <span className="font-semibold text-foreground">(⋮)</span> øverst til højre.
        </Step>
        <Step n={2} reduce={reduce}>
          Vælg{" "}
          <span className="font-semibold text-foreground">«Installér app»</span> eller{" "}
          <span className="font-semibold text-foreground">«Føj til startskærm»</span>.
        </Step>
        <Step n={3} reduce={reduce}>
          Bekræft — så ligger Bødekassen på din hjemmeskærm.
        </Step>
      </StepList>
      <p className="mt-4 text-center text-xs text-muted">
        Ser du ikke valgmuligheden? Prøv at genindlæse siden i Chrome.
      </p>
    </>
  );
}

// ---- In-app webview (Facebook/Instagram m.fl.) ----
function InAppBrowserSteps({
  container,
  reduce,
}: {
  container: Variants;
  reduce: boolean;
}) {
  const { success, error } = useToast();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      success("Link kopieret — indsæt det i Safari eller Chrome.");
    } catch {
      error("Kunne ikke kopiere linket. Kopiér adressen manuelt.");
    }
  }

  return (
    <>
      <StepList container={container} reduce={reduce}>
        <Step n={1} reduce={reduce}>
          Du er i en in-app-browser. Tryk på menuen{" "}
          <span className="font-semibold text-foreground">(•••)</span>.
        </Step>
        <Step n={2} reduce={reduce}>
          Vælg{" "}
          <span className="font-semibold text-foreground">«Åbn i Safari»</span> (iPhone) eller{" "}
          <span className="font-semibold text-foreground">«Åbn i Chrome»</span> (Android).
        </Step>
        <Step n={3} reduce={reduce}>
          Følg derefter den almindelige installations-vejledning.
        </Step>
      </StepList>
      <Button variant="secondary" className="mt-4 w-full" onClick={copyLink}>
        Kopiér link
      </Button>
    </>
  );
}
