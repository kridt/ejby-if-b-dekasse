"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, EmptyState, Input, Label, PageHeader, Spinner, cn } from "@/components/ui";
import { useCatalog } from "@/hooks/useFirestore";
import { addCatalogItem, deleteCatalogItem, swapCatalogOrder, updateCatalogItem } from "@/lib/data";
import { formatKr } from "@/lib/format";
import type { CatalogItem } from "@/lib/types";

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
          {catalog.map((item, i) => (
            <CatalogRow
              key={item.id}
              item={item}
              isFirst={i === 0}
              isLast={i === catalog.length - 1}
              onMoveUp={() => swapCatalogOrder(item, catalog[i - 1])}
              onMoveDown={() => swapCatalogOrder(item, catalog[i + 1])}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function CatalogRow({
  item,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  item: CatalogItem;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [amount, setAmount] = useState(String(item.defaultAmount));
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim() || !Number(amount)) return;
    setBusy(true);
    try {
      await updateCatalogItem(item.id, { title: title.trim(), defaultAmount: Number(amount) });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setTitle(item.title);
    setAmount(String(item.defaultAmount));
    setEditing(false);
  }

  async function remove() {
    if (!confirm(`Slet bøden «${item.title}» fra kataloget? Allerede udskrevne bøder påvirkes ikke.`)) return;
    setBusy(true);
    try {
      await deleteCatalogItem(item.id);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <Card className="space-y-3">
        <div>
          <Label htmlFor={`t-${item.id}`}>Bøde</Label>
          <Input id={`t-${item.id}`} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor={`a-${item.id}`}>Standardbeløb (kr.)</Label>
          <Input id={`a-${item.id}`} type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={save} loading={busy} disabled={!title.trim() || !Number(amount)} className="flex-1">
            Gem
          </Button>
          <Button variant="secondary" onClick={cancel} className="flex-1">
            Annullér
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("flex items-center gap-2", !item.active && "opacity-50")}>
      <div className="flex flex-col">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label="Flyt op"
          className="px-1 text-muted disabled:opacity-30 hover:text-primary"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label="Flyt ned"
          className="px-1 text-muted disabled:opacity-30 hover:text-primary"
        >
          ▼
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{item.title}</p>
        <p className="text-sm text-primary">{formatKr(item.defaultAmount)}</p>
      </div>
      <div className="flex shrink-0 items-center">
        <Button variant="ghost" className="text-xs" onClick={() => setEditing(true)}>
          Redigér
        </Button>
        <Button
          variant="ghost"
          className="text-xs"
          onClick={() => updateCatalogItem(item.id, { active: !item.active })}
        >
          {item.active ? "Skjul" : "Vis"}
        </Button>
        <Button variant="ghost" className="text-xs text-danger" onClick={remove} loading={busy}>
          Slet
        </Button>
      </div>
    </Card>
  );
}
