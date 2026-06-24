"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ensureCurrentSeason } from "@/lib/data";
import { useAuth } from "@/context/AuthContext";
import {
  useClaimedPayments,
  usePendingFines,
} from "@/hooks/useFirestore";

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const { data: pendingFines } = usePendingFines();
  const { data: claimedPayments } = useClaimedPayments();

  // Sørg for at der altid findes en aktiv sæson
  useEffect(() => {
    if (isAdmin) ensureCurrentSeason().catch(console.error);
  }, [isAdmin]);

  const pendingCount = pendingFines.length + claimedPayments.length;

  const tiles = [
    {
      href: "/admin/godkendelser",
      title: "Godkendelser",
      desc: "Godkend bøder og bekræft betalinger",
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { href: "/admin/katalog", title: "Bødekatalog", desc: "Opret og rediger bøder & priser" },
    { href: "/admin/medlemmer", title: "Medlemmer & sæson", desc: "Admins, sæsoner og MobilePay" },
  ];

  return (
    <AppShell admin>
      <PageHeader title="Admin" subtitle="Styr bødekassen for Ejby IF" />

      {pendingCount > 0 && (
        <Card className="mb-4 border-warning/40 bg-warning-bg">
          <p className="text-sm font-semibold text-warning">
            {pendingCount} ting venter på dig
          </p>
          <p className="text-sm text-muted">
            {pendingFines.length} bøder og {claimedPayments.length} betalinger skal håndteres.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="flex items-center justify-between transition hover:border-primary/40">
              <div>
                <p className="font-bold">{t.title}</p>
                <p className="text-sm text-muted">{t.desc}</p>
              </div>
              {t.badge ? <Badge tone="danger">{t.badge}</Badge> : <span className="text-muted">›</span>}
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
