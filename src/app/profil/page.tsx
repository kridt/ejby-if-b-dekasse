"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AppShell } from "@/components/AppShell";
import { PushToggle } from "@/components/PushToggle";
import { Avatar, Badge, Button, Card, EmptyState, Input, Label, SkeletonList } from "@/components/ui";
import { MoneyCounter } from "@/components/MoneyCounter";
import { Sheet } from "@/components/Sheet";
import { CheckDraw } from "@/components/CheckDraw";
import { fireConfetti } from "@/components/Celebrate";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import {
  useClubSettings,
  useCurrentSeason,
  useFinesForUser,
  usePaymentsForUser,
} from "@/hooks/useFirestore";
import { claimPayment } from "@/lib/data";
import { formatDateTime, formatKr } from "@/lib/format";
import { sendNotify } from "@/lib/notify";

export default function ProfilePage() {
  const { profile, logout, isAdmin } = useAuth();
  const { settings } = useClubSettings();
  const { season } = useCurrentSeason();

  const { data: myFines, loading: lf } = useFinesForUser(profile?.uid);
  const { data: myPayments } = usePaymentsForUser(profile?.uid);

  const { success, error } = useToast();

  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const approvedFines = useMemo(() => myFines.filter((f) => f.status === "approved"), [myFines]);
  const totalFined = approvedFines.reduce((s, f) => s + f.amount, 0);
  const confirmedPaid = myPayments.filter((p) => p.status === "confirmed").reduce((s, p) => s + p.amount, 0);
  const claimedPending = myPayments.filter((p) => p.status === "claimed").reduce((s, p) => s + p.amount, 0);
  const balance = totalFined - confirmedPaid;

  const mobilePay = settings?.mobilePayNumber;

  // "Betalt op"-tilstand er en ren udledning (ingen ref-læsning i render):
  // saldoen er 0 OG medlemmet har faktisk haft bøder. Styrer flueben + label.
  const settled = balance === 0 && totalFined > 0;

  // Konfetti-fejring: præcis ÉN gang når saldoen KRYDSER fra >0 til 0. Forrige
  // værdi holdes i en ref, så den ALDRIG genaffyres på hver Firestore-opdatering.
  // Ref'en læses kun i effekten — aldrig under render.
  const prevBalance = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevBalance.current;
    if (prev !== null && prev > 0 && balance === 0) {
      void fireConfetti();
    }
    prevBalance.current = balance;
  }, [balance]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!profile || !season || !amt || amt <= 0) return;
    setBusy(true);
    try {
      const paymentId = await claimPayment(profile, amt, season.id);
      // Notificér admins (ikke-blokerende — betalingen er allerede gemt).
      try {
        await sendNotify({ type: "payment-claimed", paymentId });
      } catch (err) {
        console.warn("Kunne ikke sende notifikation til admins:", err);
      }
      setAmount("");
      setPayOpen(false);
      success("Betaling registreret — afventer bekræftelse fra en admin.");
    } catch (err) {
      console.error(err);
      error("Kunne ikke registrere betalingen. Prøv igen.");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return null;

  return (
    <AppShell>
      <header className="mb-5 flex items-center gap-3">
        <Avatar name={profile.displayName} size={56} />
        <div className="flex-1">
          <h1 className="text-xl font-extrabold leading-tight">{profile.displayName}</h1>
          <p className="text-sm text-muted">{profile.email}</p>
        </div>
        {isAdmin && <Badge tone="success">Admin</Badge>}
      </header>

      {/* Saldo — wallet-hero. Kortet animerer rød→grøn når gælden er væk,
          og MoneyCounter (tone="auto") krydstoner tallets farve med. */}
      <Card
        raised
        className={`relative overflow-hidden transition-colors duration-700 ${
          settled ? "border-primary/30 bg-primary/5" : "border-danger/30 bg-danger-bg"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted">
              {settled ? "Status" : "Din saldo lige nu"}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <MoneyCounter
                value={balance}
                tone="auto"
                className="selectable text-3xl font-extrabold tracking-tight"
              />
            </div>
            <AnimatePresence>
              {settled && (
                <motion.p
                  key="paid-label"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="mt-1 text-base font-extrabold text-primary"
                >
                  Betalt op
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Flueben der tegnes når gælden er ryddet */}
          <AnimatePresence>
            {settled && (
              <motion.div
                key="paid-check"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="shrink-0 text-primary"
              >
                <CheckDraw size={56} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-3 flex gap-4 text-sm text-muted">
          <span>
            Bøder i alt: <strong className="selectable text-foreground">{formatKr(totalFined)}</strong>
          </span>
          <span>
            Betalt: <strong className="selectable text-foreground">{formatKr(confirmedPaid)}</strong>
          </span>
        </div>
        {claimedPending > 0 && (
          <p className="mt-2 text-sm text-warning">
            Afventer bekræftelse: <span className="selectable">{formatKr(claimedPending)}</span>
          </p>
        )}

        {balance > 0 && (
          <Button className="mt-4 w-full" onClick={() => setPayOpen(true)}>
            Jeg har betalt
          </Button>
        )}
      </Card>

      {/* Betal-formular i en native bottom-sheet */}
      <Sheet open={payOpen} onClose={() => setPayOpen(false)} title="Jeg har betalt">
        {mobilePay ? (
          <p className="text-sm text-muted">
            Send beløbet på MobilePay til{" "}
            <strong className="selectable text-foreground">{mobilePay}</strong> og registrér betalingen herunder.
          </p>
        ) : (
          <p className="text-sm text-muted">Registrér din MobilePay-betaling herunder.</p>
        )}

        <form onSubmit={handlePay} className="mt-4 space-y-3">
          <div>
            <Label htmlFor="amount">Beløb (kr.)</Label>
            <Input
              id="amount"
              type="number"
              inputMode="numeric"
              min={1}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={String(balance)}
              required
            />
          </div>

          <button
            type="button"
            onClick={() => setAmount(String(balance))}
            className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            Betal hele beløbet ({formatKr(balance)})
          </button>

          <Button type="submit" loading={busy} className="w-full">
            Registrér betaling
          </Button>
        </form>
      </Sheet>

      {/* Mine bøder */}
      <h2 className="mb-2 mt-6 font-bold">Mine bøder</h2>
      {lf ? (
        <SkeletonList rows={3} />
      ) : approvedFines.length === 0 ? (
        <EmptyState
          title="Du har ingen bøder endnu"
          hint="Hold den gode stil! 💪"
          icon={
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          }
        />
      ) : (
        <div className="space-y-2">
          {approvedFines
            .slice()
            .sort((a, b) => (b.approvedAt?.toMillis?.() ?? 0) - (a.approvedAt?.toMillis?.() ?? 0))
            .map((f) => (
              <Card key={f.id} className="flex items-center gap-3 py-3">
                <div className="flex-1">
                  <p className="selectable font-semibold">{f.reason}</p>
                  {f.comment && <p className="selectable text-sm text-muted">{f.comment}</p>}
                  <p className="mt-0.5 text-xs text-muted">{formatDateTime(f.approvedAt)}</p>
                </div>
                <span className="selectable font-bold text-danger">{formatKr(f.amount)}</span>
              </Card>
            ))}
        </div>
      )}

      {/* Push-notifikationer */}
      <PushToggle />

      <Button variant="secondary" className="mt-8 w-full" onClick={() => logout()}>
        Log ud
      </Button>
    </AppShell>
  );
}
