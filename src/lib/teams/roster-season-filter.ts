const SEASON_REGEX = /^(\d{4})-(\d{4})$/;

/**
 * Turn `seasonLabel` from the query string into a valid `YYYY-YYYY` roster season.
 * Drops accidental pasted URLs/garbage and falls back to the env default.
 */
export function coerceRosterSeasonQueryParam(
  raw: string | undefined,
  fallback: string
): string {
  const t = raw?.trim();
  if (!t) return fallback;
  const direct = SEASON_REGEX.exec(t);
  if (direct) {
    const [, a, b] = direct;
    if (Number.parseInt(a, 10) < Number.parseInt(b, 10)) return `${a}-${b}`;
  }
  const embedded = t.match(/\b(\d{4}-\d{4})\b/);
  if (embedded?.[1]) {
    const m = SEASON_REGEX.exec(embedded[1]);
    if (m) {
      const [, a, b] = m;
      if (Number.parseInt(a, 10) < Number.parseInt(b, 10)) return `${a}-${b}`;
    }
  }
  return fallback;
}
