"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onForegroundMessage } from "@/lib/messaging";
import { useToast } from "@/components/Toast";

/**
 * Viser en toast når en push-besked ankommer mens appen er åben (forgrund).
 * Service-workeren viser KUN notifikationer i baggrunden, så uden dette ville
 * brugeren intet se mens de er inde i appen. Klik på "Se" hopper til target-url.
 */
export function ForegroundNotifications() {
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let active = true;

    onForegroundMessage((payload) => {
      const data = payload.data ?? {};
      const title = data.title?.trim();
      const body = data.body?.trim() ?? "";
      const url = data.url || "/";
      const message = title ? `${title} — ${body}` : body;
      if (!message) return;
      toast(message, "info");
      // Forhåndshent destinationen så et klik føles øjeblikkeligt.
      if (url && url !== "/") router.prefetch(url);
    }).then((fn) => {
      if (active) unsub = fn;
      else fn();
    });

    return () => {
      active = false;
      unsub?.();
    };
  }, [toast, router]);

  return null;
}
