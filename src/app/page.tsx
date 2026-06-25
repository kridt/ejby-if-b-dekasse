"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AppShell } from "@/components/AppShell";
import { ClubLogo } from "@/components/ClubLogo";
import { Avatar, Badge, Card, EmptyState, SkeletonList, cn } from "@/components/ui";
import { MoneyCounter } from "@/components/MoneyCounter";
import { Podium, type PodiumMetric } from "@/components/Podium";
import { HowItWorks } from "@/components/HowItWorks";
import { useAuth } from "@/context/AuthContext";
import {
  useApprovedFines,
  useConfirmedPayments,
  useCurrentSeason,
  useUsers,
} from "@/hooks/useFirestore";
import { computeBalances, computeTotals } from "@/lib/data";
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

  const debtors = useMemo(
    () => balances.filter((b) => b.balance > 0).sort((a, b) => b.balance - a.balance),
    [balances]
  );
  const topPayers = useMemo(
    () => balances.filter((b) => b.totalPaid > 0).sort((a, b) => b.totalPaid - a.totalPaid),
    [balances]
  );
  const mostFined = useMemo(
    () => balances.filter((b) => b.fineCount > 0).sort((a, b) => b.fineCount - a.fineCount),
    [balances]
  );

  const rows = tab === "skyldnere" ? debtors : tab === "betalere" ? topPayers : mostFined;
  const podiumRows = rows.slice(0, 3);
  const listRows = rows.slice(3); // rang 4+ — top-3 lever kun i podiet

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

      {/* Sæson / alle tider — segmenteret kontrol med glidende pille */}
      <SegmentedControl
        layoutId="scope-pill"
        ariaLabel="Vælg periode"
        className="mb-4"
        value={scope}
        onChange={setScope}
        options={[
          { value: "season", label: season?.name ?? "Denne sæson" },
          { value: "all", label: "Alle tider" },
        ]}
      />

      {/* Nøgletal — rullende beløb */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <PotCard label="I bødekassen" value={totals.potTotal} />
        <StatCard label="Mangler at blive betalt" value={totals.outstandingTotal} tone="danger" />
      </div>

      {/* Faner — segmenteret kontrol (toggle-gruppe) med glidende pille */}
      <SegmentedControl
        layoutId="tab-pill"
        ariaLabel="Tavle-visninger"
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[
          { value: "skyldnere", label: "Skyldnere" },
          { value: "betalere", label: "Top-betalere" },
          { value: "boder", label: "Flest bøder" },
        ]}
      />

      {/* Indhold — krydsfade ved fane-skift */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${tab}-${scope}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {loading ? (
            <SkeletonList rows={5} />
          ) : rows.length === 0 ? (
            <EmptyForTab tab={tab} />
          ) : (
            <>
              <Podium rows={podiumRows} metric={tab as PodiumMetric} />
              <RankList rows={listRows} tab={tab} startRank={podiumRows.length + 1} />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6">
        <HowItWorks />
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/* Segmenteret kontrol (iOS-stil) med glidende motion-pille            */
/* ------------------------------------------------------------------ */

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  ariaLabel,
  role = "group",
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  layoutId: string;
  ariaLabel: string;
  role?: "group" | "tablist";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const isTabs = role === "tablist";
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex w-full gap-1 rounded-xl border border-border bg-card p-1 text-sm font-semibold",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <motion.button
            key={opt.value}
            type="button"
            role={isTabs ? "tab" : undefined}
            aria-selected={isTabs ? active : undefined}
            aria-pressed={isTabs ? undefined : active}
            onClick={() => onChange(opt.value)}
            whileTap={reduce ? undefined : { scale: 0.96 }}
            className={cn(
              "relative flex-1 rounded-lg px-3 py-1.5 text-center transition-colors",
              active ? "text-white" : "text-muted"
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 -z-0 rounded-lg bg-primary shadow-sm"
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 380, damping: 32 }
                }
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 block truncate">{opt.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nøgletals-kort                                                      */
/* ------------------------------------------------------------------ */

/** Læser (uden at skrive) om bødekassen allerede er rullet i denne session.
 *  Ren funktion — sikker i useState-initializer, også under StrictMode. */
function readFirstThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem("pot-rolled") !== "1";
  } catch {
    // sessionStorage utilgængelig (privat tilstand) — spring koldstart over.
    return false;
  }
}

/** Bødekasse-kortet: rul fra 0 én gang pr. session + engangs guld-skin. */
function PotCard({ label, value }: { label: string; value: number }) {
  const reduce = useReducedMotion();
  // Koldstart (rul fra 0) kun ved første visning i sessionen — afgøres ved mount.
  const [coldStart] = useState(readFirstThisSession);
  const [shimmer, setShimmer] = useState(() => coldStart && !reduce);

  // Markér "rullet" som en side-effekt (ikke under render).
  useEffect(() => {
    if (coldStart) {
      try {
        sessionStorage.setItem("pot-rolled", "1");
      } catch {
        /* ignore */
      }
    }
  }, [coldStart]);

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-primary/5">
      {/* Engangs guld-skin (kun transform/opacity) */}
      {shimmer && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3"
          style={{
            background:
              "linear-gradient(105deg, transparent, rgba(230,180,0,0.45), transparent)",
          }}
          initial={{ x: "-60%", opacity: 0 }}
          animate={{ x: "420%", opacity: [0, 1, 0] }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.25 }}
          onAnimationComplete={() => setShimmer(false)}
        />
      )}
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-xl font-extrabold">
        <MoneyCounter value={value} tone="primary" startFrom={coldStart ? 0 : undefined} />
      </p>
    </Card>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger";
}) {
  return (
    <Card>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-xl font-extrabold">
        <MoneyCounter value={value} tone={tone === "danger" ? "danger" : "foreground"} />
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Rang-liste med live FLIP-omsortering                                */
/* ------------------------------------------------------------------ */

function RankList({
  rows,
  tab,
  startRank,
}: {
  rows: PlayerBalance[];
  tab: Tab;
  startRank: number;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="relative space-y-2">
      <AnimatePresence mode="popLayout" initial={false}>
        {rows.map((b, i) => (
          <motion.div
            key={b.uid}
            layout
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          >
            <Link href={`/spiller/${b.uid}`} className="block">
              <Card className="flex items-center gap-3 py-3 transition hover:border-primary/40">
                <div className="w-6 text-center text-sm font-bold text-muted">{startRank + i}</div>
                <Avatar name={b.name} size={38} />
                <div className="flex min-w-0 flex-1">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{b.name}</p>
                    {b.balance > 0 ? (
                      <Badge tone="danger">Skylder</Badge>
                    ) : b.totalFined > 0 ? (
                      <Badge tone="success">Betalt op</Badge>
                    ) : null}
                  </div>
                </div>
                <div className="text-right font-bold">
                  <RowMetric b={b} tab={tab} />
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function RowMetric({ b, tab }: { b: PlayerBalance; tab: Tab }) {
  if (tab === "skyldnere") return <MoneyCounter value={b.balance} tone="danger" />;
  if (tab === "betalere") return <MoneyCounter value={b.totalPaid} tone="primary" />;
  return (
    <span>
      <MoneyCounter value={b.fineCount} tone="foreground" format={(n) => String(Math.round(n))} />
      <span className="ml-1 text-muted">bøder</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tomme tilstande (egetræs-blad via EmptyState)                       */
/* ------------------------------------------------------------------ */

function EmptyForTab({ tab }: { tab: Tab }) {
  if (tab === "skyldnere") {
    return (
      <EmptyState
        title="Ingen skylder noget lige nu"
        hint="Hele holdet er betalt op 🎉"
        icon={<CheckIcon />}
      />
    );
  }
  if (tab === "betalere") {
    return (
      <EmptyState
        title="Ingen betalinger endnu"
        hint="Når nogen betaler, dukker de op her."
        icon={<CoinIcon />}
      />
    );
  }
  return (
    <EmptyState
      title="Ingen bøder endnu"
      hint="Bødekassen er helt tom — indtil videre."
      icon={<WhistleIcon />}
    />
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
