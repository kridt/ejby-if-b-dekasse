// Lille klient-hjælper der beder serveren om at sende en push-notifikation.
// Bruges fra knapper/flows i appen. Fejl er IKKE blokerende — kalderen skal
// pakke kaldet i try/catch så kerne-handlingen lykkes uanset hvad.
"use client";

import { auth } from "./firebase";

/** Typer af notifikationer serveren kan udsende. */
export type NotifyType =
  | "fine-approved" // bøde godkendt -> spilleren
  | "fine-proposed" // bøde foreslået -> alle admins
  | "payment-claimed"; // betaling markeret -> alle admins

export interface NotifyPayload {
  type: NotifyType;
  fineId?: string;
  paymentId?: string;
  targetUid?: string;
}

/**
 * Sender en notifikationsanmodning til /api/notify med brugerens ID-token.
 * Kaster ved fejl, så kalderen selv kan logge/ignorere (non-blocking).
 */
export async function sendNotify(payload: NotifyPayload): Promise<void> {
  const current = auth.currentUser;
  if (!current) throw new Error("Ingen bruger logget ind");

  const idToken = await current.getIdToken();
  const res = await fetch("/api/notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Notify fejlede (${res.status}): ${text}`);
  }
}
