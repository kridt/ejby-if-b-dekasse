"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/components/ui";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Tilgængelig toast-hook. Brug success()/error()/toast() for kort feedback. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast skal bruges inde i en <ToastProvider>");
  return ctx;
}

const DURATION = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      counter.current += 1;
      const id = counter.current;
      setToasts((prev) => [...prev, { id, message, tone }]);
      const timer = setTimeout(() => dismiss(id), DURATION);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (m) => toast(m, "success"),
      error: (m) => toast(m, "error"),
    }),
    [toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto flex w-full max-w-md flex-col gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]"
      role="region"
      aria-label="Beskeder"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

const toneStyles: Record<ToastTone, string> = {
  success: "border-primary/30 bg-card text-foreground",
  error: "border-danger/40 bg-card text-foreground",
  info: "border-border bg-card text-foreground",
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      role="status"
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-lg",
        "animate-[toast-in_0.2s_ease-out]",
        toneStyles[toast.tone]
      )}
    >
      <ToastIcon tone={toast.tone} />
      <p className="flex-1 pt-0.5 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Luk besked"
        className="-m-1 rounded-lg p-1 text-muted transition hover:text-foreground"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return (
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (tone === "error") {
    return (
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger">
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8v5M12 16.5v.5" />
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
        </svg>
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-muted">
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 11v5M12 7.5v.5" />
        <circle cx="12" cy="12" r="9" strokeWidth="2" />
      </svg>
    </span>
  );
}
