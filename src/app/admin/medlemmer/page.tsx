"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Avatar, Badge, Button, Card, Input, Label, PageHeader, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useClubSettings, useCurrentSeason, useSeasons, useUsers } from "@/hooks/useFirestore";
import { saveClubSettings, setUserRole, startNewSeason } from "@/lib/data";
import { formatDate } from "@/lib/format";

export default function MembersPage() {
  const { profile } = useAuth();
  const { data: users, loading } = useUsers();
  const { season } = useCurrentSeason();
  const { data: seasons } = useSeasons();
  const { settings } = useClubSettings();

  const [mobilePay, setMobilePay] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [newSeasonName, setNewSeasonName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings?.mobilePayNumber) setMobilePay(settings.mobilePayNumber);
  }, [settings]);

  async function saveSettings() {
    setBusy(true);
    try {
      await saveClubSettings({ name: "Ejby IF", mobilePayNumber: mobilePay.trim() });
      setSavedMsg("Gemt!");
      setTimeout(() => setSavedMsg(""), 2000);
    } finally {
      setBusy(false);
    }
  }

  async function handleNewSeason() {
    if (!newSeasonName.trim()) return;
    if (!confirm(`Start ny sæson «${newSeasonName}»? Tavlen nulstilles for den nye sæson (gamle sæsoner gemmes).`)) return;
    setBusy(true);
    try {
      await startNewSeason(newSeasonName.trim(), season?.id ?? null);
      setNewSeasonName("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell admin>
      <PageHeader title="Medlemmer & sæson" />

      {/* MobilePay-indstilling */}
      <Card className="mb-5">
        <h2 className="font-bold">MobilePay</h2>
        <p className="mt-0.5 text-sm text-muted">Nummeret medlemmerne skal betale til.</p>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="mp">MobilePay-nummer / boks</Label>
            <Input id="mp" value={mobilePay} onChange={(e) => setMobilePay(e.target.value)} placeholder="Fx 12345" />
          </div>
          <Button onClick={saveSettings} loading={busy}>
            Gem
          </Button>
        </div>
        {savedMsg && <p className="mt-2 text-sm text-primary">{savedMsg}</p>}
      </Card>

      {/* Sæson */}
      <Card className="mb-5">
        <h2 className="font-bold">Sæson</h2>
        <p className="mt-0.5 text-sm text-muted">
          Nuværende: <strong className="text-foreground">{season?.name ?? "Ingen"}</strong>
        </p>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="ns">Start ny sæson</Label>
            <Input id="ns" value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)} placeholder="Fx 'Efterår 2026'" />
          </div>
          <Button variant="secondary" onClick={handleNewSeason} loading={busy} disabled={!newSeasonName.trim()}>
            Start
          </Button>
        </div>
        {seasons.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {seasons
              .slice()
              .sort((a, b) => (b.startDate?.toMillis?.() ?? 0) - (a.startDate?.toMillis?.() ?? 0))
              .map((s) => (
                <Badge key={s.id} tone={s.isCurrent ? "success" : "muted"}>
                  {s.name}
                  {s.endDate ? ` · ${formatDate(s.endDate)}` : ""}
                </Badge>
              ))}
          </div>
        )}
      </Card>

      {/* Medlemmer */}
      <h2 className="mb-2 font-bold">Medlemmer ({users.length})</h2>
      {loading ? (
        <div className="flex justify-center py-10 text-primary">
          <Spinner className="size-7" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.uid} className="flex items-center gap-3">
              <Avatar name={u.displayName} size={38} />
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold">{u.displayName}</p>
                <p className="truncate text-xs text-muted">{u.email}</p>
              </div>
              {u.role === "admin" ? <Badge tone="success">Admin</Badge> : <Badge>Medlem</Badge>}
              {u.uid !== profile?.uid && (
                <Button
                  variant="ghost"
                  className="text-xs"
                  onClick={() => setUserRole(u.uid, u.role === "admin" ? "member" : "admin")}
                >
                  {u.role === "admin" ? "Fjern admin" : "Gør til admin"}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
