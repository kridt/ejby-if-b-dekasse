"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ClubLogo } from "@/components/ClubLogo";
import { Avatar, Badge, Card, EmptyState, SkeletonList, cn } from "@/components/ui";
import { HowItWorks } from "@/components/HowItWorks";
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
      <div
        className="mb-4 inline-flex rounded-xl border border-border bg-card p-1 text-sm font-semibold"
        role="group"
        aria-label="Vælg periode"
      >
        <button
          type="button"
          onClick={() => setScope("season")}
          aria-pressed={scope === "season"}
          className={cn("rounded-lg px-3 py-1.5 transition", scope === "season" ? "bg-primary text-white" : "text-muted")}
        >
          {season?.name ?? "Denne sæson"}
        </button>
        <button
          type="button"
          onClick={() => setScope("all")}
          aria-pressed={scope === "all"}
          className={cn("rounded-lg px-3 py-1.5 transition", scope === "all" ? "bg-primary text-white" : "text-muted")}
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
      <div
        className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1 text-xs font-semibold"
        role="tablist"
        aria-label="Tavle-visninger"
      >
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
        <SkeletonList rows={5} />
      ) : tab === "skyldnere" ? (
        <RankList
          rows={debtors}
          emptyTitle="Ingen skylder noget lige nu"
          emptyHint="Hele holdet er betalt op 🎉"
          emptyIcon={<CheckIcon />}
          render={(b) => <span className="font-bold text-danger">{formatKr(b.balance)}</span>}
        />
      ) : tab === "betalere" ? (
        <RankList
          rows={topPayers}
          emptyTitle="Ingen betalinger endnu"
          emptyHint="Når nogen betaler, dukker de op her."
          emptyIcon={<CoinIcon />}
          render={(b) => <span className="font-bold text-primary">{formatKr(b.totalPaid)}</span>}
        />
      ) : (
        <RankList
          rows={mostFined}
          emptyTitle="Ingen bøder endnu"
          emptyHint="Bødekassen er helt tom — indtil videre."
          emptyIcon={<WhistleIcon />}
          render={(b) => (
            <span className="font-bold">
              {b.fineCount} <span className="text-muted">bøder</span>
            </span>
          )}
        />
      )}

      <div className="mt-6">
        <HowItWorks />
      </div>
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
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn("rounded-lg px-2 py-2 transition", active ? "bg-primary text-white" : "text-muted")}
    >
      {children}
    </button>
  );
}

function RankList({
  rows,
  emptyTitle,
  emptyHint,
  emptyIcon,
  render,
}: {
  rows: PlayerBalance[];
  emptyTitle: string;
  emptyHint?: string;
  emptyIcon?: React.ReactNode;
  render: (b: PlayerBalance) => React.ReactNode;
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} hint={emptyHint} icon={emptyIcon} />;
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

function CheckIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5a2.5 2.5 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 2 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2a2.5 2.5 0 0 1-2.5-1.5M12 6.5v1M12 16.5v1" />
    </svg>
  );
}

function WhistleIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a5 5 0 0 0 5 5h3l4 3v-6.5" />
      <circle cx="8" cy="12" r="2.2" />
      <path d="M11 9h10l-2 4h-8" />
    </svg>
  );
}
