// Firestore data-adgang for Ejby IF Bødekasse
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  CatalogItem,
  ClubSettings,
  Fine,
  Payment,
  PlayerBalance,
  Season,
  UserProfile,
} from "./types";

// ---- Collection-referencer ----
export const usersCol = collection(db, "users");
export const catalogCol = collection(db, "fineCatalog");
export const finesCol = collection(db, "fines");
export const paymentsCol = collection(db, "payments");
export const seasonsCol = collection(db, "seasons");

// ---- Sæsoner ----
/** Henter nuværende sæson, opretter en hvis ingen findes (kræver admin-rettighed). */
export async function ensureCurrentSeason(): Promise<Season> {
  const snap = await getDocs(query(seasonsCol, where("isCurrent", "==", true), limit(1)));
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as Omit<Season, "id">) };
  }
  const year = new Date().getFullYear();
  const ref = await addDoc(seasonsCol, {
    name: `Sæson ${year}`,
    isCurrent: true,
    startDate: serverTimestamp(),
    endDate: null,
  });
  return { id: ref.id, name: `Sæson ${year}`, isCurrent: true };
}

/** Lukker nuværende sæson og starter en ny. */
export async function startNewSeason(name: string, currentSeasonId: string | null) {
  const batch = writeBatch(db);
  if (currentSeasonId) {
    batch.update(doc(db, "seasons", currentSeasonId), {
      isCurrent: false,
      endDate: serverTimestamp(),
    });
  }
  const newRef = doc(seasonsCol);
  batch.set(newRef, {
    name,
    isCurrent: true,
    startDate: serverTimestamp(),
    endDate: null,
  });
  await batch.commit();
  return newRef.id;
}

// ---- Bødekatalog ----
export async function addCatalogItem(item: Omit<CatalogItem, "id">) {
  await addDoc(catalogCol, item);
}

export async function updateCatalogItem(id: string, patch: Partial<CatalogItem>) {
  await updateDoc(doc(db, "fineCatalog", id), patch);
}

/** Sletter en bøde fra kataloget. Eksisterende bøder beholder deres egen reason/amount-kopi. */
export async function deleteCatalogItem(id: string) {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "fineCatalog", id));
}

/**
 * Bytter rækkefølgen på to katalogbøder ved at ombytte deres sortOrder.
 * Bruges til "flyt op/ned" i admin-kataloget.
 */
export async function swapCatalogOrder(a: CatalogItem, b: CatalogItem) {
  const batch = writeBatch(db);
  batch.update(doc(db, "fineCatalog", a.id), { sortOrder: b.sortOrder });
  batch.update(doc(db, "fineCatalog", b.id), { sortOrder: a.sortOrder });
  await batch.commit();
}

// ---- Bøder ----
/** Et medlem foreslår en bøde til en holdkammerat (status: pending). */
export async function proposeFine(params: {
  target: UserProfile;
  proposer: UserProfile;
  catalogItem: CatalogItem | null;
  reason: string;
  amount: number;
  comment: string;
  seasonId: string;
}) {
  await addDoc(finesCol, {
    targetUid: params.target.uid,
    targetName: params.target.displayName,
    proposedByUid: params.proposer.uid,
    proposedByName: params.proposer.displayName,
    catalogItemId: params.catalogItem?.id ?? null,
    reason: params.reason,
    comment: params.comment,
    amount: params.amount,
    status: "pending",
    seasonId: params.seasonId,
    createdAt: serverTimestamp(),
  });
}

/** Admin godkender en bøde og kan justere beløbet. */
export async function approveFine(fineId: string, adminUid: string, finalAmount: number) {
  await updateDoc(doc(db, "fines", fineId), {
    status: "approved",
    amount: finalAmount,
    approvedByUid: adminUid,
    approvedAt: serverTimestamp(),
  });
}

/** Admin afviser et forslag (slettes — kun pending bøder kan afvises). */
export async function rejectFine(fineId: string) {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "fines", fineId));
}

// ---- Betalinger ----
/** Spiller markerer "Jeg har betalt" (status: claimed). */
export async function claimPayment(payer: UserProfile, amount: number, seasonId: string) {
  await addDoc(paymentsCol, {
    payerUid: payer.uid,
    payerName: payer.displayName,
    amount,
    status: "claimed",
    method: "mobilepay",
    seasonId,
    claimedAt: serverTimestamp(),
  });
}

/**
 * Admin registrerer en betaling på en spillers vegne (fx kontant/MobilePay-afstemning).
 * Betalingen oprettes direkte som bekræftet.
 */
export async function adminRegisterPayment(
  payer: UserProfile,
  amount: number,
  adminUid: string,
  seasonId: string
) {
  await addDoc(paymentsCol, {
    payerUid: payer.uid,
    payerName: payer.displayName,
    amount,
    status: "confirmed",
    method: "mobilepay",
    seasonId,
    confirmedByUid: adminUid,
    claimedAt: serverTimestamp(),
    confirmedAt: serverTimestamp(),
  });
}

/** Admin bekræfter en betaling. */
export async function confirmPayment(paymentId: string, adminUid: string) {
  await updateDoc(doc(db, "payments", paymentId), {
    status: "confirmed",
    confirmedByUid: adminUid,
    confirmedAt: serverTimestamp(),
  });
}

/** Admin afviser en betalingspåstand. */
export async function rejectPayment(paymentId: string) {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "payments", paymentId));
}

// ---- Medlemmer ----
export async function setUserRole(uid: string, role: "admin" | "member") {
  await updateDoc(doc(db, "users", uid), { role });
}

// ---- Klubindstillinger ----
export async function saveClubSettings(settings: Partial<ClubSettings>) {
  await setDoc(doc(db, "settings", "club"), settings, { merge: true });
}

// ---- Saldoberegning ----
/**
 * Beregner saldo pr. spiller ud fra godkendte bøder og bekræftede betalinger.
 * Hvis seasonId angives, medregnes kun den sæson; ellers alle tider.
 */
export function computeBalances(
  users: UserProfile[],
  fines: Fine[],
  payments: Payment[],
  seasonId?: string
): PlayerBalance[] {
  const map = new Map<string, PlayerBalance>();

  for (const u of users) {
    map.set(u.uid, {
      uid: u.uid,
      name: u.displayName,
      totalFined: 0,
      totalPaid: 0,
      balance: 0,
      fineCount: 0,
    });
  }

  function ensure(uid: string, name: string): PlayerBalance {
    let row = map.get(uid);
    if (!row) {
      row = { uid, name, totalFined: 0, totalPaid: 0, balance: 0, fineCount: 0 };
      map.set(uid, row);
    }
    return row;
  }

  for (const f of fines) {
    if (f.status !== "approved") continue;
    if (seasonId && f.seasonId !== seasonId) continue;
    const row = ensure(f.targetUid, f.targetName);
    row.totalFined += f.amount;
    row.fineCount += 1;
  }

  for (const p of payments) {
    if (p.status !== "confirmed") continue;
    if (seasonId && p.seasonId !== seasonId) continue;
    const row = ensure(p.payerUid, p.payerName);
    row.totalPaid += p.amount;
  }

  for (const row of map.values()) {
    row.balance = row.totalFined - row.totalPaid;
  }

  return Array.from(map.values());
}

export interface BoardTotals {
  potTotal: number; // samlet i bødekassen (alle bekræftede betalinger)
  outstandingTotal: number; // samlet skyldigt
  finedTotal: number; // samlet udskrevne (godkendte) bøder
}

export function computeTotals(balances: PlayerBalance[]): BoardTotals {
  let potTotal = 0;
  let outstandingTotal = 0;
  let finedTotal = 0;
  for (const b of balances) {
    potTotal += b.totalPaid;
    finedTotal += b.totalFined;
    if (b.balance > 0) outstandingTotal += b.balance;
  }
  return { potTotal, outstandingTotal, finedTotal };
}
