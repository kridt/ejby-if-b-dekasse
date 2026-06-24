"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ClubLogo } from "@/components/ClubLogo";
import { Avatar, Badge, Card, EmptyState, Spinner, cn } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import {
  useApprovedFines,
  useConfirmedPayments,
  useCurrentSeason,
  useUsers,
} from "@/hooks/useFirestore";
import { computeBalances, computeTotals } from "@/lib/data";
import { formatKr } from "@/lib/format";
import type { PlayerBalance } from "@/lib/types";

type Tab = "skyldnere" | "betalere" | "boder";
type Scope = "season" | "all";

export default function BoardPage() {
  const { profile } = useAuth();
  const { data: users, loading: lu } = useUsers();
  const { data: fines, loading: lf } = useApprovedFines();
  const { data: payments, loading: lp } = useConfirmedPayments();
  const { season } = useCurrentSeason();

  const [scope, setScope] = useState<Scope>("season");
  const [tab, setTab] = useState<Tab>("skyldnere");

  const seasonId = scope === "season" ? season?.id : undefined;

  const balances = useMemo(
    () => computeBalances(users, fines, payments, seasonId),
    [users, fines, payments, seasonId]
  );
  const totals = useMemo(() => computeTotals(balances), [balances]);

  const loading = lu || lf || lp;

  const debtors = balances
    .filter((b) => b.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  const topPayers = balances
    .filter((b) => b.totalPaid > 0)
    .sort((a, b) => b.totalPaid - a.totalPaid);
  const mostFined = balances
    .filter((b) => b.fineCount > 0)
    .sort((a, b) => b.fineCount - a.fineCount);

  return (
    <AppShell>
      <header className="mb-5 flex items-center gap-3">
        <ClubLogo size={44} />
        <div className="flex-1">
          <p className="text-xs font-medium text-muted">Ejby IF</p>
          <h1 className="text-xl font-extrabold leading-tight">Bødetavlen</h1>
        </div>
        {profile && <Avatar name={profile.displayName} size={40} />}
      </header>

      {/* Sæson / alle tider */}
      <div className="mb-4 inline-flex rounded-xl border border-border bg-card p-1 text-sm font-semibold">
        <button
          onClick={() => setScope("season")}
          className={cn("rounded-lg px-3 py-1.5", scope === "season" ? "bg-primary text-white" : "text-muted")}
        >
          {season?.name ?? "Denne sæson"}
        </button>
        <button
          onClick={() => setScope("all")}
          className={cn("rounded-lg px-3 py-1.5", scope === "all" ? "bg-primary text-white" : "text-muted")}
        >
          Alle tider
        </button>
      </div>

      {/* Nøgletal */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatCard label="I bødekassen" value={formatKr(totals.potTotal)} highlight />
        <StatCard label="Mangler at blive betalt" value={formatKr(totals.outstandingTotal)} tone="danger" />
      </div>

      {/* Faner */}
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1 text-xs font-semibold">
        <TabButton active={tab === "skyldnere"} onClick={() => setTab("skyldnere")}>
          Skyldnere
        </TabButton>
        <TabButton active={tab === "betalere"} onClick={() => setTab("betalere")}>
          Top-betalere
        </TabButton>
        <TabButton active={tab === "boder"} onClick={() => setTab("boder")}>
          Flest bøder
        </TabButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-primary">
          <Spinner className="size-7" />
        </div>
      ) : tab === "skyldnere" ? (
        <RankList
          rows={debtors}
          empty="Ingen skylder noget lige nu 🎉"
          render={(b) => <span className="font-bold text-danger">{formatKr(b.balance)}</span>}
        />
      ) : tab === "betalere" ? (
        <RankList
          rows={topPayers}
          empty="Ingen betalinger endnu"
          render={(b) => <span className="font-bold text-primary">{formatKr(b.totalPaid)}</span>}
        />
      ) : (
        <RankList
          rows={mostFined}
          empty="Ingen bøder endnu"
          render={(b) => (
            <span className="font-bold">
              {b.fineCount} <span className="text-muted">bøder</span>
            </span>
          )}
        />
      )}
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "danger";
}) {
  return (
    <Card className={cn(highlight && "border-primary/30 bg-primary/5")}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn("mt-1 text-xl font-extrabold", tone === "danger" ? "text-danger" : "text-foreground")}>
        {value}
      </p>
    </Card>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn("rounded-lg px-2 py-2 transition", active ? "bg-primary text-white" : "text-muted")}
    >
      {children}
    </button>
  );
}

function RankList({
  rows,
  empty,
  render,
}: {
  rows: PlayerBalance[];
  empty: string;
  render: (b: PlayerBalance) => React.ReactNode;
}) {
  if (rows.length === 0) return <EmptyState title={empty} />;
  return (
    <div className="space-y-2">
      {rows.map((b, i) => (
        <Link key={b.uid} href={`/spiller/${b.uid}`} className="block">
          <Card className="flex items-center gap-3 py-3 transition hover:border-primary/40">
            <div className="w-6 text-center text-sm font-bold text-muted">{i + 1}</div>
            <Avatar name={b.name} size={38} />
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold">{b.name}</p>
              {b.balance > 0 ? (
                <Badge tone="danger">Skylder</Badge>
              ) : b.totalFined > 0 ? (
                <Badge tone="success">Betalt op</Badge>
              ) : null}
            </div>
            <div className="text-right">{render(b)}</div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
