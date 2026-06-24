"use client";

import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  type Query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  catalogCol,
  finesCol,
  paymentsCol,
  seasonsCol,
  usersCol,
} from "@/lib/data";
import type {
  CatalogItem,
  ClubSettings,
  Fine,
  Payment,
  Season,
  UserProfile,
} from "@/lib/types";

function useCollection<T>(q: Query, deps: unknown[] = []): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[]);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore fejl:", err);
        setLoading(false);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading };
}

export function useUsers() {
  return useCollection<UserProfile>(query(usersCol, orderBy("displayName")));
}

export function useCatalog() {
  return useCollection<CatalogItem>(query(catalogCol, orderBy("sortOrder")));
}

export function useActiveCatalog() {
  return useCollection<CatalogItem>(
    query(catalogCol, where("active", "==", true), orderBy("sortOrder"))
  );
}

export function useApprovedFines() {
  return useCollection<Fine>(query(finesCol, where("status", "==", "approved")));
}

export function usePendingFines() {
  return useCollection<Fine>(query(finesCol, where("status", "==", "pending")));
}

export function useFinesForUser(uid: string | undefined) {
  return useCollection<Fine>(
    query(finesCol, where("targetUid", "==", uid ?? "__none__")),
    [uid]
  );
}

export function useConfirmedPayments() {
  return useCollection<Payment>(query(paymentsCol, where("status", "==", "confirmed")));
}

export function useClaimedPayments() {
  return useCollection<Payment>(query(paymentsCol, where("status", "==", "claimed")));
}

export function usePaymentsForUser(uid: string | undefined) {
  return useCollection<Payment>(
    query(paymentsCol, where("payerUid", "==", uid ?? "__none__")),
    [uid]
  );
}

export function useSeasons() {
  return useCollection<Season>(query(seasonsCol));
}

export function useCurrentSeason() {
  const { data, loading } = useCollection<Season>(
    query(seasonsCol, where("isCurrent", "==", true))
  );
  return { season: data[0] ?? null, loading };
}

export function useClubSettings() {
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "club"), (snap) => {
      setSettings(snap.exists() ? (snap.data() as ClubSettings) : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  return { settings, loading };
}
