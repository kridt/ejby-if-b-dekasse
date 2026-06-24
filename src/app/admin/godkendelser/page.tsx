"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Avatar, Badge, Button, Card, EmptyState, Input, PageHeader, Spinner, cn } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useClaimedPayments, usePendingFines } from "@/hooks/useFirestore";
import { approveFine, confirmPayment, rejectFine, rejectPayment } from "@/lib/data";
import { formatDateTime, formatKr } from "@/lib/format";
import type { Fine } from "@/lib/types";

type View = "fines" | "payments";

export default function ApprovalsPage() {
  const { profile } = useAuth();
  const { data: fines, loading: lf } = usePendingFines();
  const { data: payments, loading: lp } = useClaimedPayments();
  const [view, setView] = useState<View>("fines");

  return (
    <AppShell admin>
      <PageHeader title="Godkendelser" subtitle="Godkend bøder og bekræft betalinger" />

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1 text-sm font-semibold">
        <button
          onClick={() => setView("fines")}
          className={cn("rounded-lg px-3 py-2", view === "fines" ? "bg-primary text-white" : "text-muted")}
        >
          Bøder {fines.length > 0 && `(${fines.length})`}
        </button>
        <button
          onClick={() => setView("payments")}
          className={cn("rounded-lg px-3 py-2", view === "payments" ? "bg-primary text-white" : "text-muted")}
        >
          Betalinger {payments.length > 0 && `(${payments.length})`}
        </button>
      </div>

      {view === "fines" ? (
        lf ? (
          <Loader />
        ) : fines.length === 0 ? (
          <EmptyState title="Ingen bøder venter" hint="Alt er godkendt 👍" />
        ) : (
          <div className="space-y-3">
            {fines.map((f) => (
              <FineApprovalCard key={f.id} fine={f} adminUid={profile!.uid} />
            ))}
          </div>
        )
      ) : lp ? (
        <Loader />
      ) : payments.length === 0 ? (
        <EmptyState title="Ingen betalinger venter" hint="Alt er bekræftet 👍" />
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.id} className="flex items-center gap-3">
              <Avatar name={p.payerName} size={40} />
              <div className="flex-1">
                <p className="font-semibold">{p.payerName}</p>
                <p className="text-xs text-muted">Påstår betalt · {formatDateTime(p.claimedAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-primary">{formatKr(p.amount)}</p>
                <div className="mt-1 flex gap-1">
                  <Button variant="ghost" className="px-2 py-1 text-danger" onClick={() => rejectPayment(p.id)}>
                    Afvis
                  </Button>
                  <Button className="px-3 py-1" onClick={() => confirmPayment(p.id, profile!.uid)}>
                    Bekræft
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function FineApprovalCard({ fine, adminUid }: { fine: Fine; adminUid: string }) {
  const [amount, setAmount] = useState(String(fine.amount));
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    try {
      await approveFine(fine.id, adminUid, Number(amount) || fine.amount);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <Avatar name={fine.targetName} size={40} />
        <div className="flex-1">
          <p className="font-semibold">{fine.targetName}</p>
          <p className="text-sm">{fine.reason}</p>
          {fine.comment && <p className="text-sm text-muted">«{fine.comment}»</p>}
          <p className="mt-0.5 text-xs text-muted">
            Foreslået af {fine.proposedByName} · {formatDateTime(fine.createdAt)}
          </p>
        </div>
        <Badge tone="warning">Afventer</Badge>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-24"
          />
          <span className="text-sm text-muted">kr.</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" className="text-danger" onClick={() => rejectFine(fine.id)}>
            Afvis
          </Button>
          <Button loading={busy} onClick={approve}>
            Godkend
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Loader() {
  return (
    <div className="flex justify-center py-10 text-primary">
      <Spinner className="size-7" />
    </div>
  );
}
