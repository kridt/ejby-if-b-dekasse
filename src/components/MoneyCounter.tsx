"use client";

import { useEffect, useRef } from "react";
import { motion, useSpring, useTransform, useReducedMotion } from "motion/react";
import { formatKr } from "@/lib/format";
import { cn } from "@/components/ui";

type Tone = "foreground" | "primary" | "danger" | "auto";

function toneClass(tone: Tone, value: number) {
  switch (tone) {
    case "primary":
      return "text-primary";
    case "danger":
      return "text-danger";
    case "auto":
      return value > 0 ? "text-danger" : "text-primary";
    default:
      return "text-foreground";
  }
}

/**
 * Rullende kronebeløb (scoreboard-følelse). Animerer KUN ved en reel
 * værdiændring (ikke ved hver Firestore-opdatering, da value-proppen så ikke
 * ændrer sig). `startFrom` giver koldstarts-rul fra fx 0. Respekterer reduceret
 * bevægelse (snapper til slutværdi). Altid tabular-nums.
 */
export function MoneyCounter({
  value,
  tone = "foreground",
  startFrom,
  format = formatKr,
  className,
}: {
  value: number;
  tone?: Tone;
  startFrom?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const spring = useSpring(typeof startFrom === "number" ? startFrom : value, {
    mass: 1,
    stiffness: 120,
    damping: 24,
  });
  const display = useTransform(spring, (v) => format(Math.round(v)));
  const mounted = useRef(false);

  useEffect(() => {
    if (reduce) {
      spring.jump(value);
    } else if (!mounted.current && typeof startFrom !== "number") {
      // Første render uden koldstarts-rul: stå på værdien (intet rul).
      spring.jump(value);
    } else {
      spring.set(value);
    }
    mounted.current = true;
  }, [value, reduce, spring, startFrom]);

  return (
    <motion.span className={cn("tabular-nums transition-colors duration-500", toneClass(tone, value), className)}>
      {display}
    </motion.span>
  );
}
