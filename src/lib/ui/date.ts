/** Input `value` for `type="date"` (YYYY-MM-DD, UTC calendar). */
export function toYmdUtc(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parses `YYYY-MM-DD` from date inputs into UTC midnight (DB date compare). Invalid → undefined. */
export function parseDashYmdToUtcDate(s: string | undefined): Date | undefined {
  if (!s || !String(s).trim()) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return undefined;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0));
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if (y !== Number(m[1]) || mo !== Number(m[2]) || day !== Number(m[3])) return undefined;
  return d;
}

/** Human readable MM/DD/YYYY display in UTC calendar space. */
export function toUsDateUtc(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${m}/${day}/${y}`;
}
