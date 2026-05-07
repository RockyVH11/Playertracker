import { addDaysLocal, formatYmdLocal, parseYmdLocal, startOfWeekSunday } from "@/lib/fields/local-date";

/** 0 = Sunday of that week … 6 = Saturday. */
export function dayIndexInWeek(weekStartSunday: Date, day: Date): number {
  const w = new Date(
    weekStartSunday.getFullYear(),
    weekStartSunday.getMonth(),
    weekStartSunday.getDate(),
    12,
    0,
    0,
    0
  );
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12, 0, 0, 0);
  return Math.round((d.getTime() - w.getTime()) / (24 * 60 * 60 * 1000));
}

export function weekStartFromAnchor(anchorYmd: string): Date | null {
  const d = parseYmdLocal(anchorYmd);
  if (Number.isNaN(d.getTime())) return null;
  return startOfWeekSunday(d);
}

export function destDateForCopiedAssignment(
  sourceWeekStart: Date,
  destWeekStart: Date,
  sourceAssignmentDate: Date
): Date {
  const offset = dayIndexInWeek(sourceWeekStart, sourceAssignmentDate);
  return addDaysLocal(destWeekStart, offset);
}

export function sameWeek(weekStartA: Date, weekStartB: Date): boolean {
  return formatYmdLocal(weekStartA) === formatYmdLocal(weekStartB);
}
