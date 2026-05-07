import { hmToMinutes } from "@/lib/validation/fields-availability";

/** Matches schedule grid fallback when no availability rows exist. */
export const DEFAULT_OPEN_START = "08:00";
export const DEFAULT_OPEN_END = "22:00";

export type MinuteInterval = { startM: number; endM: number };

export function availabilityHullFromRows(
  rows: { startTime: string; endTime: string }[]
): MinuteInterval | null {
  if (rows.length === 0) {
    const a = hmToMinutes(DEFAULT_OPEN_START);
    const b = hmToMinutes(DEFAULT_OPEN_END);
    if (a == null || b == null) return null;
    return { startM: a, endM: b };
  }
  let minM = Infinity;
  let maxM = -Infinity;
  for (const r of rows) {
    const x = hmToMinutes(r.startTime);
    const y = hmToMinutes(r.endTime);
    if (x == null || y == null) continue;
    minM = Math.min(minM, x);
    maxM = Math.max(maxM, y);
  }
  if (!Number.isFinite(minM) || !Number.isFinite(maxM) || maxM <= minM) {
    const a = hmToMinutes(DEFAULT_OPEN_START);
    const b = hmToMinutes(DEFAULT_OPEN_END);
    if (a == null || b == null) return null;
    return { startM: a, endM: b };
  }
  return { startM: minM, endM: maxM };
}

export function mergeIntervals(intervals: MinuteInterval[]): MinuteInterval[] {
  const sorted = [...intervals]
    .filter((i) => i.endM > i.startM)
    .sort((a, b) => a.startM - b.startM);
  const out: MinuteInterval[] = [];
  for (const cur of sorted) {
    const last = out[out.length - 1];
    if (!last || cur.startM >= last.endM) out.push({ ...cur });
    else last.endM = Math.max(last.endM, cur.endM);
  }
  return out;
}

export function clipToHull(iv: MinuteInterval, hull: MinuteInterval): MinuteInterval | null {
  const startM = Math.max(iv.startM, hull.startM);
  const endM = Math.min(iv.endM, hull.endM);
  if (endM <= startM) return null;
  return { startM, endM };
}

export function unionLength(intervals: MinuteInterval[]): number {
  return mergeIntervals(intervals).reduce((s, i) => s + (i.endM - i.startM), 0);
}

/**
 * Blackout segments clipped to the open-hours hull (matches blackout-display “partial =
 * full day” convention).
 */
export function blackoutIntervalsInHull(
  blackouts: Array<{ startTime: string | null; endTime: string | null }>,
  hull: MinuteInterval
): MinuteInterval[] {
  const raw: MinuteInterval[] = [];
  for (const b of blackouts) {
    if (b.startTime == null && b.endTime == null) {
      raw.push({ startM: hull.startM, endM: hull.endM });
      continue;
    }
    if (b.startTime == null || b.endTime == null) {
      raw.push({ startM: hull.startM, endM: hull.endM });
      continue;
    }
    const s = hmToMinutes(b.startTime);
    const e = hmToMinutes(b.endTime);
    if (s == null || e == null || e <= s) continue;
    const clipped = clipToHull({ startM: s, endM: e }, hull);
    if (clipped) raw.push(clipped);
  }
  return mergeIntervals(raw);
}

/** Open minutes minus merged blackout coverage within hull. */
export function netOpenMinutes(hull: MinuteInterval, blackoutIntervals: MinuteInterval[]): number {
  const hullLen = hull.endM - hull.startM;
  const blocked = unionLength(blackoutIntervals);
  return Math.max(0, hullLen - blocked);
}

export function assignmentMinutes(startTime: string, endTime: string): number {
  const s = hmToMinutes(startTime);
  const e = hmToMinutes(endTime);
  if (s == null || e == null || e <= s) return 0;
  return e - s;
}
