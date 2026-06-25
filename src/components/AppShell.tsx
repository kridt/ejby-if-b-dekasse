"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { FullScreenLoader, cn } from "@/components/ui";

const navItems = [
  { href: "/", label: "Tavle", icon: TrophyIcon },
  { href: "/giv-bode", label: "Giv bøde", icon: WhistleIcon },
  { href: "/profil", label: "Min profil", icon: UserIcon },
];

/** Native app-skal: fast 100dvh, grøn safe-area-bjælke, én scroll-container,
 *  flydende bundnavigation. Beskytter ruter (kun loggede-ind brugere). */
export function AppShell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, profile, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && admin && !isAdmin) router.replace("/");
  }, [loading, user, admin, isAdmin, router]);

  if (loading || !user || !profile) return <FullScreenLoader />;
  if (admin && !isAdmin) return <FullScreenLoader />;

  const items = isAdmin
    ? [...navItems, { href: "/admin", label: "Admin", icon: ShieldIcon }]
    : navItems;

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col bg-background">
      {/* Grøn safe-area-bjælke under notchen (statuslinjen læser brand-grøn) */}
      <div
        aria-hidden
        className="shrink-0 bg-primary"
        style={{ height: "env(safe-area-inset-top)", viewTransitionName: "appchrome-top" } as React.CSSProperties}
      />

      {/* Den ENESTE scroll-container */}
      <main className="app-scroll flex-1 px-4 pb-6 pt-5">{children}</main>

      {/* Flydende bundnavigation */}
      <nav
        aria-label="Hovednavigation"
        className="shrink-0 border-t border-border bg-card/85 backdrop-blur-lg"
        style={{ paddingBottom: "env(safe-area-inset-bottom)", viewTransitionName: "appchrome-nav" } as React.CSSProperties}
      >
        <div
          className="mx-auto grid"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center justify-center py-1.5",
                  "focus-visible:outline-none"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-x-3 inset-y-1 -z-0 rounded-2xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <motion.span
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "relative z-10 flex flex-col items-center gap-1 rounded-xl px-3 py-1 text-xs font-semibold transition-colors",
                    "group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-1",
                    active ? "text-primary" : "text-muted"
                  )}
                >
                  <Icon className={cn("size-6 transition-transform", active && "scale-110")} aria-hidden="true" />
                  {item.label}
                </motion.span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ---- Ikoner (inline SVG) ----
type IconProps = { className?: string };

function TrophyIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}

function WhistleIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a5 5 0 0 0 5 5h3l4 3v-6.5" />
      <circle cx="8" cy="12" r="2.2" />
      <path d="M11 9h10l-2 4h-8" />
    </svg>
  );
}

function UserIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function ShieldIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
    </svg>
  );
}
