import { hmToMinutes } from "@/lib/validation/fields-availability";

export function minutesToHm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Half-open intervals [start, end) in minutes since midnight. */
export function rangesOverlapMinutes(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && startB < endA;
}

export function hmRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const a0 = hmToMinutes(startA);
  const a1 = hmToMinutes(endA);
  const b0 = hmToMinutes(startB);
  const b1 = hmToMinutes(endB);
  if (a0 == null || a1 == null || b0 == null || b1 == null) return false;
  return rangesOverlapMinutes(a0, a1, b0, b1);
}

/** Slot [slotStart, slotStart + slotMinutes) overlaps assignment [start,end]. */
export function assignmentOverlapsSlot(
  assignmentStart: string,
  assignmentEnd: string,
  slotStart: string,
  slotMinutes: number
): boolean {
  const as = hmToMinutes(assignmentStart);
  const ae = hmToMinutes(assignmentEnd);
  const ss = hmToMinutes(slotStart);
  if (as == null || ae == null || ss == null) return false;
  const se = ss + slotMinutes;
  return rangesOverlapMinutes(as, ae, ss, se);
}

/**
 * True if the half-open slot [slotStart, slotStart + slotMinutes) overlaps any
 * availability window [startTime, endTime). If `windows` is empty, returns true (caller treats as unconstrained).
 */
export function slotCoveredByAvailabilityWindows(
  slotStartHm: string,
  slotMinutes: number,
  windows: readonly { startTime: string; endTime: string }[]
): boolean {
  if (windows.length === 0) return true;
  const ss = hmToMinutes(slotStartHm);
  if (ss == null) return false;
  const se = ss + slotMinutes;
  for (const w of windows) {
    const w0 = hmToMinutes(w.startTime);
    const w1 = hmToMinutes(w.endTime);
    if (w0 == null || w1 == null) continue;
    if (rangesOverlapMinutes(ss, se, w0, w1)) return true;
  }
  return false;
}

export function addMinutesToHm(startHm: string, deltaMinutes: number): string | null {
  const s = hmToMinutes(startHm);
  if (s == null) return null;
  return minutesToHm(s + deltaMinutes);
}
