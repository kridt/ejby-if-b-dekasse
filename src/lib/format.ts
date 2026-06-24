// Danske formateringshjælpere

const kr = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 0,
});

/** Formaterer et kronebeløb, fx 120 -> "120 kr." */
export function formatKr(amount: number): string {
  return kr.format(amount ?? 0);
}

const dateFmt = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

type TsLike = { toDate: () => Date } | Date | null | undefined;

function toDate(ts: TsLike): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof (ts as { toDate?: unknown }).toDate === "function") {
    return (ts as { toDate: () => Date }).toDate();
  }
  return null;
}

export function formatDate(ts: TsLike): string {
  const d = toDate(ts);
  return d ? dateFmt.format(d) : "—";
}

export function formatDateTime(ts: TsLike): string {
  const d = toDate(ts);
  return d ? dateTimeFmt.format(d) : "—";
}

/** Initialer fra et navn, fx "Christian Nielsen" -> "CN" */
export function initials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
