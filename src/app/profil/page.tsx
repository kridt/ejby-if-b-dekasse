"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PushToggle } from "@/components/PushToggle";
import { Avatar, Badge, Button, Card, EmptyState, Input, Label, SkeletonList } from "@/components/ui";
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

  const approvedFines = useMemo(() => myFines.filter((f) => f.status === "approved"), [myFines]);
  const totalFined = approvedFines.reduce((s, f) => s + f.amount, 0);
  const confirmedPaid = myPayments.filter((p) => p.status === "confirmed").reduce((s, p) => s + p.amount, 0);
  const claimedPending = myPayments.filter((p) => p.status === "claimed").reduce((s, p) => s + p.amount, 0);
  const balance = totalFined - confirmedPaid;

  const mobilePay = settings?.mobilePayNumber;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!profile || !season || !amt || amt <= 0) return;
    setBusy(true);
    try {
      await claimPayment(profile, amt, season.id);
      // Notificér admins (ikke-blokerende — betalingen er allerede gemt).
      try {
        await sendNotify({ type: "payment-claimed" });
      } catch (err) {
        console.warn("Kunne ikke sende notifikation til admins:", err);
      }
      setAmount("");
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

      {/* Saldo */}
      <Card className={balance > 0 ? "border-danger/30 bg-danger-bg" : "border-primary/30 bg-primary/5"}>
        <p className="text-xs font-medium text-muted">Din saldo lige nu</p>
        <p className={`mt-1 text-3xl font-extrabold ${balance > 0 ? "text-danger" : "text-primary"}`}>
          {balance > 0 ? formatKr(balance) : "Betalt op 🎉"}
        </p>
        <div className="mt-3 flex gap-4 text-sm text-muted">
          <span>Bøder i alt: <strong className="text-foreground">{formatKr(totalFined)}</strong></span>
          <span>Betalt: <strong className="text-foreground">{formatKr(confirmedPaid)}</strong></span>
        </div>
        {claimedPending > 0 && (
          <p className="mt-2 text-sm text-warning">Afventer bekræftelse: {formatKr(claimedPending)}</p>
        )}
      </Card>

      {/* Betal */}
      {balance > 0 && (
        <Card className="mt-4">
          <h2 className="font-bold">Betal din gæld</h2>
          {mobilePay ? (
            <p className="mt-1 text-sm text-muted">
              Send beløbet på MobilePay til <strong className="text-foreground">{mobilePay}</strong> og registrér
              betalingen herunder.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Registrér din MobilePay-betaling herunder.</p>
          )}
          <form onSubmit={handlePay} className="mt-3 flex items-end gap-2">
            <div className="flex-1">
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
            <Button type="submit" loading={busy}>
              Jeg har betalt
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setAmount(String(balance))}
            className="mt-2 text-xs font-semibold text-primary"
          >
            Betal hele beløbet ({formatKr(balance)})
          </button>
        </Card>
      )}

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
                  <p className="font-semibold">{f.reason}</p>
                  {f.comment && <p className="text-sm text-muted">{f.comment}</p>}
                  <p className="mt-0.5 text-xs text-muted">{formatDateTime(f.approvedAt)}</p>
                </div>
                <span className="font-bold text-danger">{formatKr(f.amount)}</span>
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
