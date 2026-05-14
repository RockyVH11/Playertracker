/** MM/DD/YY for intake DOB field (UTC calendar components). */
export function formatDobAsMmDdYyUtc(d: Date): string {
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const y = String(d.getUTCFullYear()).slice(-2);
  return `${m}/${day}/${y}`;
}
