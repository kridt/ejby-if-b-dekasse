"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, EmptyState, Input, Label, PageHeader, Spinner, cn } from "@/components/ui";
import { useCatalog } from "@/hooks/useFirestore";
import { addCatalogItem, updateCatalogItem } from "@/lib/data";
import { formatKr } from "@/lib/format";

const STARTER = [
  { title: "For sent til træning", defaultAmount: 20 },
  { title: "For sent til kamp", defaultAmount: 50 },
  { title: "Glemt støvler/udstyr", defaultAmount: 30 },
  { title: "Mobil i omklædningsrummet", defaultAmount: 20 },
  { title: "Selvmål", defaultAmount: 25 },
  { title: "Rødt kort (dumt)", defaultAmount: 100 },
];

export default function CatalogPage() {
  const { data: catalog, loading } = useCatalog();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !Number(amount)) return;
    setBusy(true);
    try {
      await addCatalogItem({
        title: title.trim(),
        defaultAmount: Number(amount),
        active: true,
        sortOrder: catalog.length,
      });
      setTitle("");
      setAmount("");
    } finally {
      setBusy(false);
    }
  }

  async function seedStarters() {
    setBusy(true);
    try {
      await Promise.all(
        STARTER.map((s, i) =>
          addCatalogItem({ title: s.title, defaultAmount: s.defaultAmount, active: true, sortOrder: i })
        )
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell admin>
      <PageHeader title="Bødekatalog" subtitle="Bøder som medlemmerne kan vælge imellem" />

      <Card className="mb-5">
        <form onSubmit={add} className="space-y-3">
          <div>
            <Label htmlFor="title">Bøde</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fx 'For sent til træning'" />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="amount">Standardbeløb (kr.)</Label>
              <Input id="amount" type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="20" />
            </div>
            <Button type="submit" loading={busy} disabled={!title.trim() || !Number(amount)}>
              Tilføj
            </Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10 text-primary">
          <Spinner className="size-7" />
        </div>
      ) : catalog.length === 0 ? (
        <div className="space-y-3">
          <EmptyState title="Kataloget er tomt" hint="Tilføj bøder ovenfor — eller start med et standardkatalog." />
          <Button variant="secondary" className="w-full" onClick={seedStarters} loading={busy}>
            Opret standard-bødekatalog
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {catalog.map((item) => (
            <Card key={item.id} className={cn("flex items-center gap-3", !item.active && "opacity-50")}>
              <div className="flex-1">
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-primary">{formatKr(item.defaultAmount)}</p>
              </div>
              <Button
                variant="ghost"
                className="text-xs"
                onClick={() => updateCatalogItem(item.id, { active: !item.active })}
              >
                {item.active ? "Skjul" : "Vis"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
