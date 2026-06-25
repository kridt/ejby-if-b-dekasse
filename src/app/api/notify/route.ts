// POST /api/notify — udsender push-notifikationer for Ejby IF Bødekasse.
// Verificerer kalderen via Firebase ID-token, håndhæver simple autz-regler,
// slår modtagere op i Firestore og sender multicast via firebase-admin.
//
// Body: { type, fineId?, paymentId?, targetUid? }
//   "fine-approved"   -> notificér den bødede spiller (kun admin må trigge)
//   "fine-proposed"   -> notificér alle admins
//   "payment-claimed" -> notificér alle admins
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";
import { sendPushToRecipients, type Recipient } from "@/lib/push";

// Skal køre på Node.js-runtime (firebase-admin bruger Node-API'er) og altid
// dynamisk (læser Authorization-header).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NotifyBody {
  type?: string;
  fineId?: string;
  paymentId?: string;
  targetUid?: string;
}

/** Formaterer et kronebeløb dansk, fx 120 -> "120 kr." */
function kr(amount: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

export async function POST(request: Request) {
  let admin;
  try {
    admin = getAdmin();
  } catch (err) {
    console.error("Admin-init fejlede:", err);
    return NextResponse.json({ error: "Server ikke konfigureret" }, { status: 503 });
  }
  const { auth, db } = admin;

  // ---- Verificér kalderen ----
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    return NextResponse.json({ error: "Mangler token" }, { status: 401 });
  }

  let callerUid: string;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    callerUid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Ugyldigt token" }, { status: 401 });
  }

  const callerSnap = await db.collection("users").doc(callerUid).get();
  if (!callerSnap.exists) {
    return NextResponse.json({ error: "Ukendt bruger" }, { status: 403 });
  }
  const callerIsAdmin = callerSnap.get("role") === "admin";

  // ---- Læs body ----
  let body: NotifyBody;
  try {
    body = (await request.json()) as NotifyBody;
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  // ---- Hjælpere til modtager-opslag ----
  async function adminRecipients(): Promise<Recipient[]> {
    const snap = await db.collection("users").where("role", "==", "admin").get();
    return snap.docs.map((d) => ({ uid: d.id, tokens: d.get("fcmTokens") ?? [] }));
  }

  async function userRecipient(uid: string): Promise<Recipient[]> {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return [];
    return [{ uid: snap.id, tokens: snap.get("fcmTokens") ?? [] }];
  }

  // Saldo for en spiller = sum(godkendte bøder) - sum(bekræftede betalinger).
  async function balanceFor(uid: string): Promise<number> {
    const [finesSnap, paySnap] = await Promise.all([
      db.collection("fines").where("targetUid", "==", uid).where("status", "==", "approved").get(),
      db.collection("payments").where("payerUid", "==", uid).where("status", "==", "confirmed").get(),
    ]);
    let fined = 0;
    finesSnap.forEach((d) => (fined += (d.get("amount") as number) ?? 0));
    let paid = 0;
    paySnap.forEach((d) => (paid += (d.get("amount") as number) ?? 0));
    return fined - paid;
  }

  try {
    switch (body.type) {
      // Admin har godkendt en bøde -> notificér den bødede spiller.
      case "fine-approved": {
        if (!callerIsAdmin) {
          return NextResponse.json({ error: "Kræver admin" }, { status: 403 });
        }
        if (!body.fineId) {
          return NextResponse.json({ error: "Mangler fineId" }, { status: 400 });
        }
        const fineSnap = await db.collection("fines").doc(body.fineId).get();
        if (!fineSnap.exists) {
          return NextResponse.json({ error: "Bøde findes ikke" }, { status: 404 });
        }
        const fine = fineSnap.data() as {
          targetUid: string;
          reason: string;
          amount: number;
        };
        const [recipients, balance] = await Promise.all([
          userRecipient(fine.targetUid),
          balanceFor(fine.targetUid),
        ]);
        const result = await sendPushToRecipients(recipients, {
          title: "Av, en bøde! 🟨",
          body: `«${fine.reason}» kostede dig ${kr(fine.amount)}. Du skylder nu ${kr(balance)} til kassen 💸`,
          url: "/profil",
          tag: `fine-${body.fineId}`,
        });
        return NextResponse.json({ ok: true, ...result });
      }

      // Medlem har foreslået en bøde -> notificér alle admins (med detaljer).
      case "fine-proposed": {
        let line = "Et medlem har foreslået en ny bøde.";
        if (body.fineId) {
          const fineSnap = await db.collection("fines").doc(body.fineId).get();
          if (fineSnap.exists) {
            const f = fineSnap.data() as {
              proposedByName?: string;
              targetName?: string;
              reason?: string;
              amount?: number;
            };
            line = `${f.proposedByName ?? "Et medlem"} vil give ${f.targetName ?? "en spiller"} en bøde: «${f.reason ?? "bøde"}» (${kr(f.amount ?? 0)}).`;
          }
        }
        const recipients = await adminRecipients();
        const result = await sendPushToRecipients(recipients, {
          title: "Ny bøde i kø 🟨",
          body: `${line} Godkend den i appen 👀`,
          url: "/admin/godkendelser",
          tag: body.fineId ? `proposed-${body.fineId}` : "proposed",
        });
        return NextResponse.json({ ok: true, ...result });
      }

      // Medlem har markeret en betaling -> notificér alle admins (med beløb).
      case "payment-claimed": {
        let payerName = callerSnap.get("displayName") ?? "Et medlem";
        let amountText = "";
        if (body.paymentId) {
          const paySnap = await db.collection("payments").doc(body.paymentId).get();
          if (paySnap.exists) {
            payerName = paySnap.get("payerName") ?? payerName;
            const amt = paySnap.get("amount") as number | undefined;
            if (typeof amt === "number") amountText = ` på ${kr(amt)}`;
          }
        }
        const recipients = await adminRecipients();
        const result = await sendPushToRecipients(recipients, {
          title: "Penge på vej 💰",
          body: `${payerName} siger de har betalt${amountText}. Bekræft det i appen ✅`,
          url: "/admin/godkendelser",
          tag: body.paymentId ? `payment-${body.paymentId}` : "payment",
        });
        return NextResponse.json({ ok: true, ...result });
      }

      default:
        return NextResponse.json({ error: "Ukendt type" }, { status: 400 });
    }
  } catch (err) {
    console.error("Notify-fejl:", err);
    return NextResponse.json({ error: "Intern fejl" }, { status: 500 });
  }
}
