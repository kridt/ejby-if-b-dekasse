"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Avatar, cn } from "@/components/ui";
import { MoneyCounter } from "@/components/MoneyCounter";
import type { PlayerBalance } from "@/lib/types";

export type PodiumMetric = "skyldnere" | "betalere" | "boder";

type Rank = "gold" | "silver" | "bronze";

/** Tynd metal-ring rundt om en avatar (guld/sølv/bronze). */
const ringStyle: Record<Rank, string> = {
  gold: "ring-2 ring-[#e6b400] shadow-[0_0_0_4px_rgba(230,180,0,0.18)]",
  silver: "ring-2 ring-[#c9ccd2] shadow-[0_0_0_4px_rgba(201,204,210,0.20)]",
  bronze: "ring-2 ring-[#c08348] shadow-[0_0_0_4px_rgba(192,131,72,0.18)]",
};

const medalBg: Record<Rank, string> = {
  gold: "bg-[#e6b400] text-[#3a2c00]",
  silver: "bg-[#c9ccd2] text-[#2c2f35]",
  bronze: "bg-[#c08348] text-[#2a1a0c]",
};

/** Bøde-tællerens visning afhænger af fanen. */
function MetricValue({ b, metric }: { b: PlayerBalance; metric: PodiumMetric }) {
  if (metric === "skyldnere") {
    return <MoneyCounter value={b.balance} tone="danger" />;
  }
  if (metric === "betalere") {
    return <MoneyCounter value={b.totalPaid} tone="primary" />;
  }
  return (
    <span className="text-white">
      <MoneyCounter
        value={b.fineCount}
        tone="foreground"
        className="text-white"
        format={(n) => String(Math.round(n))}
      />
      <span className="ml-1 text-xs font-medium text-white/70">bøder</span>
    </span>
  );
}

function PodiumPlace({
  b,
  rank,
  place,
  metric,
  delay,
}: {
  b: PlayerBalance;
  rank: Rank;
  place: 1 | 2 | 3;
  metric: PodiumMetric;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const leader = place === 1;
  // Trappe-højder (2-1-3): leder højest og centreret.
  const stepHeight = leader ? "h-24" : place === 2 ? "h-16" : "h-12";
  const avatarSize = leader ? 64 : 52;

  return (
    <motion.div
      layout
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 26, delay }}
      className={cn("flex min-w-0 flex-1 flex-col items-center", leader && "-mt-4")}
    >
      <Link
        href={`/spiller/${b.uid}`}
        className="flex w-full flex-col items-center gap-1.5 rounded-2xl px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <div className="relative">
          <div className={cn("rounded-full", ringStyle[rank])}>
            <Avatar name={b.name} size={avatarSize} />
          </div>
          <span
            className={cn(
              "absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full text-xs font-extrabold shadow-sm ring-2 ring-white/80",
              medalBg[rank]
            )}
            aria-hidden="true"
          >
            {place}
          </span>
        </div>

        <p
          className={cn(
            "mt-1 max-w-full truncate text-center font-bold text-white drop-shadow-sm",
            leader ? "text-sm" : "text-xs"
          )}
          title={b.name}
        >
          {b.name}
        </p>
        <div className={cn("font-extrabold drop-shadow-sm", leader ? "text-base" : "text-sm")}>
          <MetricValue b={b} metric={metric} />
        </div>
      </Link>

      {/* Trappe-trin */}
      <div
        className={cn(
          "mt-2 w-full rounded-t-xl border-t border-white/25 bg-white/10 backdrop-blur-sm",
          stepHeight
        )}
        aria-hidden="true"
      />
    </motion.div>
  );
}

/**
 * Podiet — top-3 i en 2-1-3-trappe på græsplænen.
 * Renderer KUN top-3; rang 4+ vises i listen (hver spiller præcis ét sted).
 * Degraderer pænt ved færre end 3 spillere.
 */
export function Podium({
  rows,
  metric,
}: {
  rows: PlayerBalance[];
  metric: PodiumMetric;
}) {
  const top3 = rows.slice(0, 3);
  if (top3.length === 0) return null;

  const [first, second, third] = top3;

  return (
    <div
      className="bg-pitch relative mb-5 overflow-hidden rounded-3xl border border-primary-dark/40 px-3 pb-3 pt-6 shadow-sm"
      style={{
        // Selvstændig "--pitch"-gradient (klassen findes ikke i globals.css).
        backgroundImage:
          "linear-gradient(160deg, var(--primary-light) 0%, var(--primary) 48%, var(--primary-dark) 100%)",
      }}
    >
      {/* Bane-striber (transform/opacity-venlige, dekorative) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0 28px, rgba(255,255,255,0.9) 28px 56px)",
        }}
      />

      <div className="relative flex items-end justify-center gap-2">
        {/* Venstre: nr. 2 (sølv) */}
        {second ? (
          <PodiumPlace b={second} rank="silver" place={2} metric={metric} delay={0.05} />
        ) : (
          <div className="flex-1" aria-hidden="true" />
        )}

        {/* Midt: nr. 1 (guld), løftet */}
        <PodiumPlace b={first} rank="gold" place={1} metric={metric} delay={0} />

        {/* Højre: nr. 3 (bronze) */}
        {third ? (
          <PodiumPlace b={third} rank="bronze" place={3} metric={metric} delay={0.1} />
        ) : (
          <div className="flex-1" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
