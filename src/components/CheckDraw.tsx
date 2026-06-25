"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Et roligt grønt flueben der "tegnes" via Motion pathLength.
 * Transform/opacity-only (pathLength animeres via SVG, ingen layout).
 * Respekterer reduceret bevægelse: fluebenet vises da bare med det samme.
 *
 * Bruges to steder:
 *  - "Betalt op"-fejringen i profil (efter saldoen rammer 0).
 *  - Den rolige kvittering på giv-bøde (afventer godkendelse, INGEN konfetti).
 */
export function CheckDraw({
  size = 80,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Ring der toner ind */}
      <motion.circle
        cx="40"
        cy="40"
        r="36"
        stroke="currentColor"
        strokeOpacity={0.18}
        strokeWidth="4"
        initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        style={{ transformOrigin: "40px 40px" }}
      />
      {/* Selve fluebenet der tegnes */}
      <motion.path
        d="M25 41.5 L36 52 L56 29"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={
          reduce
            ? { duration: 0 }
            : { delay: 0.12, duration: 0.5, ease: [0.65, 0, 0.35, 1] }
        }
      />
    </svg>
  );
}
