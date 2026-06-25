"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { initials } from "@/lib/format";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  variant = "primary",
  className,
  children,
  loading,
  disabled,
  ...props
}: Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: Variant;
  loading?: boolean;
  children?: ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<Variant, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary-dark shadow-sm",
    secondary: "bg-card text-foreground border border-border hover:bg-background",
    danger: "bg-danger text-white hover:opacity-90",
    ghost: "text-muted hover:bg-background",
  };
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(base, variants[variant], className)}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </motion.button>
  );
}

export function Card({
  className,
  children,
  raised,
}: {
  className?: string;
  children: ReactNode;
  raised?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", raised ? "shadow-raised" : "shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

export function Avatar({
  name,
  size = 40,
  ring,
  vtName,
  className,
}: {
  name: string;
  size?: number;
  ring?: "gold" | "silver" | "bronze";
  vtName?: string;
  className?: string;
}) {
  const ringColor =
    ring === "gold" ? "var(--gold)" : ring === "silver" ? "var(--silver)" : ring === "bronze" ? "var(--bronze)" : undefined;
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary", className)}
      style={
        {
          width: size,
          height: size,
          fontSize: size * 0.38,
          ...(ringColor ? { boxShadow: `0 0 0 2px var(--card), 0 0 0 4px ${ringColor}` } : {}),
          ...(vtName ? { viewTransitionName: vtName } : {}),
        } as React.CSSProperties
      }
    >
      {initials(name)}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "danger" | "success" | "warning";
}) {
  const tones = {
    muted: "bg-background text-muted",
    danger: "bg-danger-bg text-danger",
    success: "bg-primary/10 text-primary",
    warning: "bg-warning-bg text-warning",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Egetræs-blad fra klubbens crest — brugt som svagt vandmærke i tomme tilstande. */
export function OakLeaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2c.55 1.3.4 2.5-.2 3.5.85-.3 1.7-.2 2.5.25-.5.95-1.25 1.55-2 1.85.95.2 1.8.75 2.3 1.6-.85.4-1.8.4-2.6.1.65.8.95 1.85.75 2.85-.95-.2-1.75-.8-2.2-1.6-.1.95-.55 1.9-1.35 2.5-.8-.6-1.25-1.55-1.35-2.5-.45.8-1.25 1.4-2.2 1.6-.2-1 .1-2.05.75-2.85-.8.3-1.75.3-2.6-.1.5-.85 1.35-1.4 2.3-1.6-.75-.3-1.5-.9-2-1.85.8-.45 1.65-.55 2.5-.25-.6-1-.75-2.2-.2-3.5z" />
      <path d="M12 12.5V22" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="relative flex flex-col items-center overflow-hidden px-6 py-8 text-center text-muted">
      <OakLeaf className="pointer-events-none absolute -right-3 -top-2 size-24 text-primary/5" />
      {icon && (
        <div className="relative mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <p className="font-semibold text-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm">{hint}</p>}
    </Card>
  );
}

/** Animeret skelet-pladsholder (shimmer) til indlæsningstilstande. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-foreground/10", className)}
    />
  );
}

/** En skelet-række der matcher kort-layoutet på tavle/profil. */
export function SkeletonRow() {
  return (
    <Card className="flex items-center gap-3 py-3" aria-hidden="true">
      <Skeleton className="size-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-4 w-14" />
    </Card>
  );
}

/** Liste af skelet-rækker med tilgængelig status-besked. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Indlæser…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-primary">
      <Spinner className="size-8" />
    </div>
  );
}
