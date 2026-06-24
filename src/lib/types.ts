// Delte typer for Ejby IF Bødekasse
import type { Timestamp } from "firebase/firestore";

export type Role = "admin" | "member";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  photoURL?: string;
  createdAt?: Timestamp;
}

export interface CatalogItem {
  id: string;
  title: string; // fx "For sent til træning"
  defaultAmount: number; // i kr
  active: boolean;
  sortOrder: number;
}

export type FineStatus = "pending" | "approved";

export interface Fine {
  id: string;
  targetUid: string; // hvem der får bøden
  targetName: string;
  proposedByUid: string;
  proposedByName: string;
  catalogItemId: string | null;
  reason: string; // titel på bøden
  comment: string;
  amount: number; // i kr
  status: FineStatus;
  seasonId: string;
  approvedByUid?: string;
  createdAt?: Timestamp;
  approvedAt?: Timestamp;
}

export type PaymentStatus = "claimed" | "confirmed";

export interface Payment {
  id: string;
  payerUid: string;
  payerName: string;
  amount: number; // i kr
  status: PaymentStatus;
  method: "mobilepay";
  seasonId: string;
  confirmedByUid?: string;
  claimedAt?: Timestamp;
  confirmedAt?: Timestamp;
}

export interface Season {
  id: string;
  name: string; // fx "Forår 2026"
  isCurrent: boolean;
  startDate?: Timestamp;
  endDate?: Timestamp | null;
}

export interface ClubSettings {
  name: string;
  primaryColor: string;
  mobilePayNumber: string;
  crestURL?: string;
}

// Beregnet saldo pr. spiller
export interface PlayerBalance {
  uid: string;
  name: string;
  totalFined: number; // sum af godkendte bøder
  totalPaid: number; // sum af bekræftede betalinger
  balance: number; // skyldig = totalFined - totalPaid
  fineCount: number; // antal godkendte bøder
}
