"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { FullScreenLoader, cn } from "@/components/ui";

const navItems = [
  { href: "/", label: "Tavle", icon: TrophyIcon },
  { href: "/giv-bode", label: "Giv bøde", icon: WhistleIcon },
  { href: "/profil", label: "Min profil", icon: UserIcon },
];

/** Beskytter ruter: kun loggede-ind brugere. Viser bundnavigation. */
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-28 pt-6">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur"
        aria-label="Hovednavigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
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
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                  active ? "text-primary" : "text-muted"
                )}
              >
                <Icon className={cn("size-6 transition-transform", active && "scale-110")} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div style={{ height: "env(safe-area-inset-bottom)" }} />
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
