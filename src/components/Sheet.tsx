"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Native-agtig fjeder-bottom-sheet: gribehåndtag, træk-for-at-lukke, backdrop,
 * Esc-lukning, fokus-håndtering og safe-area-bund. Bruger position:fixed, så den
 * dækker hele viewporten uanset app-skallens scroll-container.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => panelRef.current?.focus(), 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      restoreFocus.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-[1.5rem] border border-border bg-card shadow-raised outline-none"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 38 }}
            drag={reduce ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 700) onClose();
            }}
          >
            {/* Gribehåndtag */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-1.5 w-10 rounded-full bg-border" aria-hidden />
            </div>
            {title && (
              <h2 className="px-5 pb-1 pt-1 text-lg font-extrabold tracking-tight">{title}</h2>
            )}
            <div className="px-5 pt-2">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
