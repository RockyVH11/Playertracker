import type { DayOfWeek, FieldRotationCadence } from "@prisma/client";
import { dayOfWeekFromDate } from "@/lib/fields/day-of-week-from-date";
import { DAY_OF_WEEK_ORDER } from "@/lib/fields/day-of-week-order";
import { addDaysLocal, formatYmdLocal, parseYmdLocal } from "@/lib/fields/local-date";

export type RotationMemberSlot = {
  slotIndex: number;
  primaryFieldId: string;
};

export function sortedRotationMembers(members: RotationMemberSlot[]): RotationMemberSlot[] {
  return [...members].sort((a, b) => a.slotIndex - b.slotIndex);
}

/** Field for a slot at rotation phase (cyclic shift through primary fields). */
export function fieldIdForRotationSlot(
  members: RotationMemberSlot[],
  slotIndex: number,
  phase: number
): string | null {
  const ordered = sortedRotationMembers(members);
  const n = ordered.length;
  if (n === 0) return null;
  const pos = ordered.findIndex((m) => m.slotIndex === slotIndex);
  if (pos < 0) return null;
  const fields = ordered.map((m) => m.primaryFieldId);
  const p = ((phase % n) + n) % n;
  return fields[(pos + p) % n] ?? null;
}

export function weeksBetween(anchor: Date, date: Date): number {
  const a = parseYmdLocal(formatYmdLocal(anchor));
  const d = parseYmdLocal(formatYmdLocal(date));
  const diffMs = d.getTime() - a.getTime();
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

export function monthsBetween(anchor: Date, date: Date): number {
  return (
    (date.getFullYear() - anchor.getFullYear()) * 12 + (date.getMonth() - anchor.getMonth())
  );
}

/** Index of `dow` within the rotation weekday list (SUN–SAT order). */
export function dayIndexAmongRotationDays(dow: DayOfWeek, daysOfWeek: DayOfWeek[]): number {
  const set = new Set(daysOfWeek);
  const ordered = DAY_OF_WEEK_ORDER.filter((d) => set.has(d));
  return ordered.indexOf(dow);
}

export function rotationPhaseIndex(input: {
  cadence: FieldRotationCadence;
  anchorDate: Date;
  assignmentDate: Date;
  daysOfWeek: DayOfWeek[];
  memberCount: number;
}): number {
  const n = Math.max(1, input.memberCount);
  const { cadence, anchorDate, assignmentDate, daysOfWeek } = input;

  switch (cadence) {
    case "DAILY": {
      const dow = dayOfWeekFromDate(assignmentDate);
      const idx = dayIndexAmongRotationDays(dow, daysOfWeek);
      return idx < 0 ? 0 : idx % n;
    }
    case "WEEKLY": {
      const w = weeksBetween(anchorDate, assignmentDate);
      return ((w % n) + n) % n;
    }
    case "BIWEEKLY": {
      const w = Math.floor(weeksBetween(anchorDate, assignmentDate) / 2);
      return ((w % n) + n) % n;
    }
    case "MONTHLY": {
      const m = monthsBetween(anchorDate, assignmentDate);
      return ((m % n) + n) % n;
    }
    default:
      return 0;
  }
}

export function datesMatchingRotationWeekdays(
  start: Date,
  end: Date,
  daysOfWeek: DayOfWeek[]
): Date[] {
  const target = new Set(daysOfWeek);
  const out: Date[] = [];
  let cursor = parseYmdLocal(formatYmdLocal(start));
  const endD = parseYmdLocal(formatYmdLocal(end));
  while (cursor <= endD) {
    if (target.has(dayOfWeekFromDate(cursor))) {
      out.push(new Date(cursor));
    }
    cursor = addDaysLocal(cursor, 1);
  }
  return out;
}
