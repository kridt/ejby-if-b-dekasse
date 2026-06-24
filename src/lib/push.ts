// Server-side push-afsendelse for Ejby IF Bødekasse.
// Sender multicast via firebase-admin og rydder ugyldige tokens op.
import { FieldValue } from "firebase-admin/firestore";
import { getAdmin } from "./firebaseAdmin";

export interface PushMessage {
  title: string;
  body: string;
  /** Hvor brugeren havner ved klik (default "/"). */
  url?: string;
}

/** En modtager = en bruger-uid + dennes registrerede FCM-tokens. */
export interface Recipient {
  uid: string;
  tokens: string[];
}

/**
 * Sender den samme besked til alle modtageres tokens. Ugyldige/udløbne
 * tokens fjernes automatisk fra brugerens Firestore-dokument.
 * Returnerer antal lykkedes/fejlede afsendelser.
 */
export async function sendPushToRecipients(
  recipients: Recipient[],
  message: PushMessage
): Promise<{ successCount: number; failureCount: number }> {
  const { messaging, db } = getAdmin();

  // Byg en flad liste af (uid, token) så vi kan mappe fejl tilbage til en bruger.
  const entries: { uid: string; token: string }[] = [];
  for (const r of recipients) {
    for (const t of r.tokens ?? []) entries.push({ uid: r.uid, token: t });
  }
  if (entries.length === 0) return { successCount: 0, failureCount: 0 };

  const tokens = entries.map((e) => e.token);
  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: message.title, body: message.body },
    data: {
      title: message.title,
      body: message.body,
      url: message.url ?? "/",
    },
    webpush: {
      fcmOptions: { link: message.url ?? "/" },
      notification: { icon: "/icon-192.png", badge: "/icon-192.png" },
    },
  });

  // Saml ugyldige tokens pr. bruger og fjern dem.
  const invalidByUser = new Map<string, string[]>();
  res.responses.forEach((r, i) => {
    if (r.success) return;
    const code = r.error?.code ?? "";
    const isInvalid =
      code === "messaging/invalid-registration-token" ||
      code === "messaging/registration-token-not-registered";
    if (isInvalid) {
      const { uid, token } = entries[i];
      const arr = invalidByUser.get(uid) ?? [];
      arr.push(token);
      invalidByUser.set(uid, arr);
    }
  });

  await Promise.all(
    Array.from(invalidByUser.entries()).map(([uid, bad]) =>
      db
        .collection("users")
        .doc(uid)
        .update({ fcmTokens: FieldValue.arrayRemove(...bad) })
        .catch((e) => console.warn(`Kunne ikke rydde tokens for ${uid}:`, e))
    )
  );

  return { successCount: res.successCount, failureCount: res.failureCount };
}
