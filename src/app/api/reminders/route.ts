// GET /api/reminders — ugentlig påmindelse til spillere med gæld.
// Beskyttet af CRON_SECRET (Bearer). Kaldes af Vercel Cron (se vercel.json).
//
// Beregner saldo server-side ud fra godkendte bøder og bekræftede betalinger,
// og sender en push til hver spiller med positiv saldo.
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";
import { sendPushToRecipients, type Recipient } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function kr(amount: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export async function GET(request: Request) {
  // ---- Verificér cron-kald ----
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET ikke sat" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token !== secret) {
    return NextResponse.json({ error: "Uautoriseret" }, { status: 401 });
  }

  let db;
  try {
    db = getAdmin().db;
  } catch (err) {
    console.error("Admin-init fejlede:", err);
    return NextResponse.json({ error: "Server ikke konfigureret" }, { status: 503 });
  }

  try {
    // Hent alle brugere, godkendte bøder og bekræftede betalinger.
    const [usersSnap, finesSnap, paymentsSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("fines").where("status", "==", "approved").get(),
      db.collection("payments").where("status", "==", "confirmed").get(),
    ]);

    // Saldo pr. uid = sum(godkendte bøder) - sum(bekræftede betalinger).
    const fined = new Map<string, number>();
    const paid = new Map<string, number>();

    finesSnap.forEach((d) => {
      const uid = d.get("targetUid") as string;
      const amount = (d.get("amount") as number) ?? 0;
      fined.set(uid, (fined.get(uid) ?? 0) + amount);
    });
    paymentsSnap.forEach((d) => {
      const uid = d.get("payerUid") as string;
      const amount = (d.get("amount") as number) ?? 0;
      paid.set(uid, (paid.get(uid) ?? 0) + amount);
    });

    let notified = 0;
    let totalSuccess = 0;

    await Promise.all(
      usersSnap.docs.map(async (u) => {
        const balance = (fined.get(u.id) ?? 0) - (paid.get(u.id) ?? 0);
        if (balance <= 0) return;

        const recipients: Recipient[] = [{ uid: u.id, tokens: u.get("fcmTokens") ?? [] }];
        if (recipients[0].tokens.length === 0) return;

        const result = await sendPushToRecipients(recipients, {
          title: "Påmindelse: du skylder til bødekassen 💰",
          body: `Din saldo er ${kr(balance)}. Husk at betale via MobilePay.`,
          url: "/profil",
        });
        notified += 1;
        totalSuccess += result.successCount;
      })
    );

    return NextResponse.json({ ok: true, debtorsNotified: notified, pushesSent: totalSuccess });
  } catch (err) {
    console.error("Reminders-fejl:", err);
    return NextResponse.json({ error: "Intern fejl" }, { status: 500 });
  }
}
