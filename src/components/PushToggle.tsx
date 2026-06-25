"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { usePwa } from "@/hooks/usePwa";
import {
  currentPermission,
  pushSupported,
  requestAndSaveToken,
  type PushResult,
} from "@/lib/messaging";

type State =
  | "loading" // tjekker understøttelse
  | "unsupported" // browser/enhed understøtter ikke push
  | "ready" // kan aktiveres
  | "enabled" // aktiveret
  | "denied" // blokeret af brugeren
  | "no-vapid" // server mangler VAPID-nøgle
  | "error";

export function PushToggle() {
  const { profile } = useAuth();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  // PWA-tilstand: på iOS kræver push at appen er installeret på hjemmeskærmen.
  const isIOS = usePwa((s) => s.isIOS);
  const isStandalone = usePwa((s) => s.isStandalone);
  const needsInstallFirst = isIOS && !isStandalone;

  useEffect(() => {
    let active = true;
    (async () => {
      const supported = await pushSupported();
      if (!active) return;
      if (!supported) {
        setState("unsupported");
        return;
      }
      const perm = currentPermission();
      if (perm === "granted") setState("enabled");
      else if (perm === "denied") setState("denied");
      else setState("ready");
    })();
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    if (!profile) return;
    setBusy(true);
    try {
      const result: PushResult = await requestAndSaveToken(profile.uid);
      const map: Record<PushResult, State> = {
        enabled: "enabled",
        denied: "denied",
        unsupported: "unsupported",
        "no-vapid": "no-vapid",
        error: "error",
      };
      setState(map[result]);
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  return (
    <Card className="mt-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl">
          🔔
        </div>
        <div className="flex-1">
          <h2 className="font-bold">Notifikationer</h2>
          {needsInstallFirst && state !== "enabled" ? (
            <p className="mt-1 text-sm text-muted">
              Installér appen på hjemmeskærmen for at få notifikationer.
            </p>
          ) : state === "enabled" ? (
            <p className="mt-1 text-sm text-primary">
              Notifikationer er aktiveret på denne enhed. Du får besked om nye bøder og betalinger.
            </p>
          ) : state === "denied" ? (
            <p className="mt-1 text-sm text-muted">
              Notifikationer er blokeret i din browser. Tillad dem i browserens indstillinger for
              denne side, og prøv igen.
            </p>
          ) : state === "unsupported" ? (
            <p className="mt-1 text-sm text-muted">
              Din browser eller enhed understøtter ikke push-notifikationer. På iPhone skal appen
              være installeret på hjemmeskærmen først.
            </p>
          ) : state === "no-vapid" ? (
            <p className="mt-1 text-sm text-muted">
              Notifikationer er ikke konfigureret på serveren endnu. Kontakt en admin.
            </p>
          ) : state === "error" ? (
            <p className="mt-1 text-sm text-danger">
              Noget gik galt. Prøv igen om lidt.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Få en notifikation når du får en bøde, og når der er noget at godkende.
            </p>
          )}

          {needsInstallFirst ? (
            <Link
              href="/installer"
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-background"
            >
              Sådan installerer du appen
            </Link>
          ) : (
            (state === "ready" || state === "error") && (
              <Button className="mt-3" loading={busy} onClick={enable}>
                Aktivér notifikationer
              </Button>
            )
          )}
        </div>
      </div>
    </Card>
  );
}
