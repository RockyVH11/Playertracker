import { hmToMinutes } from "@/lib/validation/fields-availability";

/** Default first-visible band when opening the schedule grid (evening practices). */
export const DEFAULT_SCHEDULE_VIEW_START_HM = "18:00";

/** Visible vertical span of the grid (scroll for full day). */
export const DEFAULT_SCHEDULE_VIEWPORT_HOURS = 4;

/** First slot index at or after `minHm`, or 0 if none. */
export function indexFirstSlotAtOrAfter(slotStarts: string[], minHm: string): number {
  if (slotStarts.length === 0) return 0;
  const minM = hmToMinutes(minHm);
  if (minM == null) return 0;
  for (let i = 0; i < slotStarts.length; i++) {
    const m = hmToMinutes(slotStarts[i]);
    if (m != null && m >= minM) return i;
  }
  return 0;
}

/** Row count that fits the viewport height (e.g. four hours of 30-minute slots → 8 rows). */
export function viewportRowCount(viewportHours: number, slotMinutes: number): number {
  if (slotMinutes <= 0) return 8;
  return Math.max(1, Math.round((viewportHours * 60) / slotMinutes));
}
