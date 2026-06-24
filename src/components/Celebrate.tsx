"use client";

// Rationeret fejring: kald KUN fra de tre fortjente milepæle (appinstalled,
// admin godkender en bøde, "Betalt op") bag en engangs-guard hos kalderen.
// Lazy-importerer canvas-confetti, så det holdes ude af den initiale bundle.

type ConfettiFn = (opts?: Record<string, unknown>) => void;
let confettiFn: ConfettiFn | null = null;

export async function fireConfetti() {
  if (typeof window === "undefined") return;

  // Haptik (kun Android — iOS ignorerer stille; må aldrig bære betydning alene).
  try {
    navigator.vibrate?.(15);
  } catch {
    /* ignore */
  }

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  if (!confettiFn) {
    const mod = (await import("canvas-confetti")) as unknown as { default: ConfettiFn };
    confettiFn = mod.default;
  }
  confettiFn({
    particleCount: 60,
    spread: 70,
    startVelocity: 38,
    ticks: 200,
    origin: { y: 0.7 },
    colors: ["#0E4D2A", "#2f9e5a", "#ffffff"],
    disableForReducedMotion: true,
    zIndex: 9999,
  });
}
