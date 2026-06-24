"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Avatar, Button, Card, EmptyState, Label, PageHeader, Select, SkeletonList, Textarea, cn } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { useActiveCatalog, useCurrentSeason, useUsers } from "@/hooks/useFirestore";
import { proposeFine } from "@/lib/data";
import { formatKr } from "@/lib/format";
import { sendNotify } from "@/lib/notify";

export default function GivBodePage() {
  const { profile } = useAuth();
  const { data: users, loading: lu } = useUsers();
  const { data: catalog, loading: lc } = useActiveCatalog();
  const { season } = useCurrentSeason();

  const [targetUid, setTargetUid] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const teammates = useMemo(
    () => users.filter((u) => u.uid !== profile?.uid),
    [users, profile]
  );
  const selectedItem = catalog.find((c) => c.id === catalogId) ?? null;
  const target = users.find((u) => u.uid === targetUid) ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!profile || !target || !selectedItem) return;
    if (!season) {
      setError("Sæsonen er ikke startet endnu — bed en admin om at åbne bødekassen.");
      return;
    }
    setBusy(true);
    try {
      await proposeFine({
        target,
        proposer: profile,
        catalogItem: selectedItem,
        reason: selectedItem.title,
        amount: selectedItem.defaultAmount,
        comment: comment.trim(),
        seasonId: season.id,
      });
      // Notificér admins om den nye bøde (ikke-blokerende).
      try {
        await sendNotify({ type: "fine-proposed" });
      } catch (err) {
        console.warn("Kunne ikke sende notifikation til admins:", err);
      }
      setDone(true);
      toast.success("Bøde sendt til godkendelse");
    } catch (err) {
      console.error(err);
      setError("Kunne ikke sende bøden. Prøv igen.");
      toast.error("Kunne ikke sende bøden. Prøv igen.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-4xl">⚽️</div>
          <h2 className="mt-4 text-xl font-extrabold">Bøde sendt!</h2>
          <p className="mt-1 max-w-xs text-sm text-muted">
            {target?.displayName} får bøden når en admin har godkendt den.
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              setDone(false);
              setTargetUid("");
              setCatalogId("");
              setComment("");
            }}
          >
            Giv en bøde mere
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Giv en bøde" subtitle="Alle bøder skal godkendes af en admin" />

      {lu || lc ? (
        <SkeletonList rows={4} />
      ) : catalog.length === 0 ? (
        <EmptyState title="Bødekataloget er tomt" hint="En admin skal oprette bøder i kataloget først." />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="target">Hvem skal have en bøde?</Label>
            <Select id="target" value={targetUid} onChange={(e) => setTargetUid(e.target.value)} required>
              <option value="">Vælg holdkammerat…</option>
              {teammates.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.displayName}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Hvilken bøde?</Label>
            <div className="space-y-2">
              {catalog.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setCatalogId(item.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left transition",
                    catalogId === item.id ? "border-primary ring-2 ring-primary/20" : "border-border"
                  )}
                >
                  <span className="font-medium">{item.title}</span>
                  <span className="font-bold text-primary">{formatKr(item.defaultAmount)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="comment">Kommentar (valgfri)</Label>
            <Textarea
              id="comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Fx 'Kom 10 min for sent til kamp'"
            />
          </div>

          {target && selectedItem && (
            <Card className="flex items-center gap-3 border-primary/30 bg-primary/5">
              <Avatar name={target.displayName} size={40} />
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{target.displayName}</span> får bøden{" "}
                  <span className="font-semibold">«{selectedItem.title}»</span>
                </p>
              </div>
              <span className="font-extrabold text-primary">{formatKr(selectedItem.defaultAmount)}</span>
            </Card>
          )}

          {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

          <Button type="submit" loading={busy} disabled={!targetUid || !catalogId} className="w-full">
            Send bøde til godkendelse
          </Button>
        </form>
      )}
    </AppShell>
  );
}
