"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Avatar, Badge, Button, Card, EmptyState, Input, Label, Spinner } from "@/components/ui";
import { MoneyCounter } from "@/components/MoneyCounter";
import { CheckDraw } from "@/components/CheckDraw";
import { useAuth } from "@/context/AuthContext";
import {
  useCurrentSeason,
  useFinesForUser,
  usePaymentsForUser,
  useUsers,
} from "@/hooks/useFirestore";
import { adminRegisterPayment, computeBalances } from "@/lib/data";
import { formatDate, formatKr } from "@/lib/format";

/** Formaterer millisekunder fra historikken som en dato (eller "—"). */
function fmtMillis(at: number): string {
  return at ? formatDate(new Date(at)) : "—";
}

type HistoryEntry =
  | { kind: "fine"; id: string; at: number; title: string; comment?: string; amount: number }
  | { kind: "payment"; id: string; at: number; amount: number; confirmed: boolean };

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
    () => fines.filter((f) => f.status === "approved"),
    [fines]
  );

  // Kronologisk samlet historik (bøder + betalinger), nyeste først.
  const history = useMemo<HistoryEntry[]>(() => {
    const entries: HistoryEntry[] = [];
    for (const f of approvedFines) {
      entries.push({
        kind: "fine",
        id: f.id,
        at: f.approvedAt?.toMillis?.() ?? 0,
        title: f.reason,
        comment: f.comment,
        amount: f.amount,
      });
    }
    for (const p of payments) {
      entries.push({
        kind: "payment",
        id: p.id,
        at: p.confirmedAt?.toMillis?.() ?? p.claimedAt?.toMillis?.() ?? 0,
        amount: p.amount,
        confirmed: p.status === "confirmed",
      });
    }
    return entries.sort((a, b) => b.at - a.at);
  }, [approvedFines, payments]);

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
  const settled = balance.balance === 0 && balance.totalFined > 0;

  return (
    <AppShell>
      <Link href="/" className="mb-3 inline-block text-sm font-semibold text-primary">
        ‹ Tilbage til tavlen
      </Link>

      {/* Large-title header. Avatar bærer en stabil vtName til den senere
          morph fra Tavle-rækken (ingen ViewTransition-wrapper her). */}
      <header className="mb-5 flex items-center gap-3">
        <Avatar name={name} size={64} vtName={`player-avatar-${uid}`} />
        <div className="min-w-0 flex-1">
          <h1 className="selectable truncate text-[28px] font-extrabold leading-tight tracking-tight">{name}</h1>
          {player?.email && <p className="selectable truncate text-sm text-muted">{player.email}</p>}
        </div>
      </header>

      {/* Saldo — rullende kronebeløb med automatisk farve (rød ved gæld, grøn ved 0). */}
      <Card
        raised
        className={`relative overflow-hidden transition-colors duration-700 ${
          settled ? "border-primary/30 bg-primary/5" : balance.balance > 0 ? "border-danger/30 bg-danger-bg" : "border-primary/30 bg-primary/5"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted">Saldo</p>
            <span
              id={`player-amount-${uid}`}
              className="mt-1 block"
              style={{ viewTransitionName: `player-amount-${uid}` }}
            >
              <MoneyCounter
                value={balance.balance}
                tone="auto"
                className="selectable text-3xl font-extrabold tracking-tight"
              />
            </span>
            {settled && <p className="mt-1 text-base font-extrabold text-primary">Betalt op</p>}
          </div>
          {settled && (
            <div className="shrink-0 text-primary">
              <CheckDraw size={52} />
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-4 text-sm text-muted">
          <span>
            Bøder i alt: <strong className="selectable text-foreground">{formatKr(balance.totalFined)}</strong>
          </span>
          <span>
            Betalt: <strong className="selectable text-foreground">{formatKr(balance.totalPaid)}</strong>
          </span>
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

      {/* Historik — kronologisk: bøder (rød) + betalinger (grøn) med datoer. */}
      <h2 className="mb-2 mt-6 font-bold">Historik</h2>
      {loading ? (
        <div className="flex justify-center py-10 text-primary">
          <Spinner className="size-7" />
        </div>
      ) : history.length === 0 ? (
        <EmptyState title="Ingen historik endnu" hint="Bøder og betalinger vises her." />
      ) : (
        <div className="space-y-2">
          {history.map((entry) =>
            entry.kind === "fine" ? (
              <Card key={`f-${entry.id}`} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="selectable font-semibold">{entry.title}</p>
                  {entry.comment && <p className="selectable text-sm text-muted">{entry.comment}</p>}
                  <p className="mt-0.5 text-xs text-muted">{fmtMillis(entry.at)}</p>
                </div>
                <span className="selectable font-bold text-danger">+{formatKr(entry.amount)}</span>
              </Card>
            ) : (
              <Card key={`p-${entry.id}`} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="selectable font-semibold text-primary">Betaling</p>
                  <p className="mt-0.5 text-xs text-muted">{fmtMillis(entry.at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {entry.confirmed ? (
                    <Badge tone="success">Bekræftet</Badge>
                  ) : (
                    <Badge tone="warning">Afventer</Badge>
                  )}
                  <span className="selectable font-bold text-primary">−{formatKr(entry.amount)}</span>
                </div>
              </Card>
            )
          )}
        </div>
      )}
    </AppShell>
  );
}
