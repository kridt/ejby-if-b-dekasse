"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Avatar, Badge, Button, Card, EmptyState, Input, Label, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import {
  useCurrentSeason,
  useFinesForUser,
  usePaymentsForUser,
  useUsers,
} from "@/hooks/useFirestore";
import { adminRegisterPayment, computeBalances } from "@/lib/data";
import { formatDateTime, formatKr } from "@/lib/format";

export default function PlayerPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const { isAdmin, profile } = useAuth();

  const { data: users } = useUsers();
  const { data: fines, loading: lf } = useFinesForUser(uid);
  const { data: payments, loading: lp } = usePaymentsForUser(uid);
  const { season } = useCurrentSeason();

  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const player = users.find((u) => u.uid === uid);
  const name = player?.displayName ?? fines[0]?.targetName ?? payments[0]?.payerName ?? "Spiller";

  const balance = useMemo(() => {
    const rows = computeBalances(player ? [player] : [], fines, payments);
    return (
      rows.find((r) => r.uid === uid) ?? {
        uid,
        name,
        totalFined: 0,
        totalPaid: 0,
        balance: 0,
        fineCount: 0,
      }
    );
  }, [player, fines, payments, uid, name]);

  const approvedFines = useMemo(
    () =>
      fines
        .filter((f) => f.status === "approved")
        .slice()
        .sort((a, b) => (b.approvedAt?.toMillis?.() ?? 0) - (a.approvedAt?.toMillis?.() ?? 0)),
    [fines]
  );

  const sortedPayments = useMemo(
    () =>
      payments
        .slice()
        .sort(
          (a, b) =>
            (b.confirmedAt?.toMillis?.() ?? b.claimedAt?.toMillis?.() ?? 0) -
            (a.confirmedAt?.toMillis?.() ?? a.claimedAt?.toMillis?.() ?? 0)
        ),
    [payments]
  );

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const amt = Number(amount);
    if (!profile || !season || !amt || amt <= 0) return;
    const target = player ?? {
      uid,
      displayName: name,
      email: "",
      role: "member" as const,
    };
    setBusy(true);
    try {
      await adminRegisterPayment(target, amt, profile.uid, season.id);
      setAmount("");
      setMsg(`Betaling på ${formatKr(amt)} registreret.`);
    } catch (err) {
      console.error(err);
      setMsg("Kunne ikke registrere betalingen. Prøv igen.");
    } finally {
      setBusy(false);
    }
  }

  const loading = lf || lp;

  return (
    <AppShell>
      <Link href="/" className="mb-3 inline-block text-sm font-semibold text-primary">
        ‹ Tilbage til tavlen
      </Link>

      <header className="mb-5 flex items-center gap-3">
        <Avatar name={name} size={56} />
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-xl font-extrabold leading-tight">{name}</h1>
          {player?.email && <p className="truncate text-sm text-muted">{player.email}</p>}
        </div>
      </header>

      {/* Saldo */}
      <Card className={balance.balance > 0 ? "border-danger/30 bg-danger-bg" : "border-primary/30 bg-primary/5"}>
        <p className="text-xs font-medium text-muted">Saldo</p>
        <p className={`mt-1 text-3xl font-extrabold ${balance.balance > 0 ? "text-danger" : "text-primary"}`}>
          {balance.balance > 0 ? formatKr(balance.balance) : "Betalt op 🎉"}
        </p>
        <div className="mt-3 flex gap-4 text-sm text-muted">
          <span>Bøder i alt: <strong className="text-foreground">{formatKr(balance.totalFined)}</strong></span>
          <span>Betalt: <strong className="text-foreground">{formatKr(balance.totalPaid)}</strong></span>
        </div>
      </Card>

      {/* Admin: registrér betaling */}
      {isAdmin && (
        <Card className="mt-4">
          <h2 className="font-bold">Registrér betaling</h2>
          <p className="mt-1 text-sm text-muted">
            Registrér en kontant- eller MobilePay-betaling på spillerens vegne. Den bekræftes med det samme.
          </p>
          <form onSubmit={handleRegister} className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="reg-amount">Beløb (kr.)</Label>
              <Input
                id="reg-amount"
                type="number"
                inputMode="numeric"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={balance.balance > 0 ? String(balance.balance) : "0"}
                required
              />
            </div>
            <Button type="submit" loading={busy}>
              Registrér
            </Button>
          </form>
          {balance.balance > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(balance.balance))}
              className="mt-2 text-xs font-semibold text-primary"
            >
              Hele gælden ({formatKr(balance.balance)})
            </button>
          )}
          {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-10 text-primary">
          <Spinner className="size-7" />
        </div>
      ) : (
        <>
          {/* Bøder */}
          <h2 className="mb-2 mt-6 font-bold">Bøder ({approvedFines.length})</h2>
          {approvedFines.length === 0 ? (
            <EmptyState title="Ingen bøder" hint="Spilleren har ingen godkendte bøder." />
          ) : (
            <div className="space-y-2">
              {approvedFines.map((f) => (
                <Card key={f.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{f.reason}</p>
                    {f.comment && <p className="text-sm text-muted">{f.comment}</p>}
                    <p className="mt-0.5 text-xs text-muted">{formatDateTime(f.approvedAt)}</p>
                  </div>
                  <span className="font-bold text-danger">{formatKr(f.amount)}</span>
                </Card>
              ))}
            </div>
          )}

          {/* Betalinger */}
          <h2 className="mb-2 mt-6 font-bold">Betalinger ({sortedPayments.length})</h2>
          {sortedPayments.length === 0 ? (
            <EmptyState title="Ingen betalinger" hint="Spilleren har ikke registreret betalinger endnu." />
          ) : (
            <div className="space-y-2">
              {sortedPayments.map((p) => (
                <Card key={p.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{formatKr(p.amount)}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDateTime(p.confirmedAt ?? p.claimedAt)}
                    </p>
                  </div>
                  {p.status === "confirmed" ? (
                    <Badge tone="success">Bekræftet</Badge>
                  ) : (
                    <Badge tone="warning">Afventer</Badge>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
