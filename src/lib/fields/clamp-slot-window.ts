/** When `requested` is missing or not a valid grid slot, use the earliest allowed slot (or ""). */
export function clampSlotWindowStart(slots: string[], requested?: string | null): string {
  const r = typeof requested === "string" ? requested.trim() : "";
  if (r && slots.includes(r)) return r;
  return slots[0] ?? "";
}
