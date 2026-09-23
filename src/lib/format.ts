const TZ = "Asia/Bangkok";

export function formatBaht(amount: number | string | null | undefined) {
  const n = Number(amount ?? 0);
  return `฿${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Parses a Postgres DATE (YYYY-MM-DD) without timezone shifting. */
export function parseDateOnly(value: string) {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return parseDateOnly(value).toLocaleDateString("th-TH", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Today's date in Asia/Bangkok as YYYY-MM-DD. */
export function todayBangkok() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** First day of the current Bangkok month as YYYY-MM-DD. */
export function monthStartBangkok(offsetMonths = 0) {
  const [y, m] = todayBangkok().split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offsetMonths, 1));
  return d.toISOString().slice(0, 10);
}

export function monthLabelTh(yyyymm: string) {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("th-TH", { timeZone: "UTC", month: "short", year: "2-digit" });
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
