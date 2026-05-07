import { DayOfWeek } from "@prisma/client";

/** Display / sort order (Sunday first). */
export const DAY_OF_WEEK_ORDER: DayOfWeek[] = [
  DayOfWeek.SUN,
  DayOfWeek.MON,
  DayOfWeek.TUE,
  DayOfWeek.WED,
  DayOfWeek.THU,
  DayOfWeek.FRI,
  DayOfWeek.SAT,
];

export function dayOfWeekSortIndex(d: DayOfWeek): number {
  return DAY_OF_WEEK_ORDER.indexOf(d);
}

export function dayOfWeekLabel(d: DayOfWeek): string {
  const labels: Record<DayOfWeek, string> = {
    [DayOfWeek.SUN]: "Sunday",
    [DayOfWeek.MON]: "Monday",
    [DayOfWeek.TUE]: "Tuesday",
    [DayOfWeek.WED]: "Wednesday",
    [DayOfWeek.THU]: "Thursday",
    [DayOfWeek.FRI]: "Friday",
    [DayOfWeek.SAT]: "Saturday",
  };
  return labels[d];
}
