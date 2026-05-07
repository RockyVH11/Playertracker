import { DayOfWeek } from "@prisma/client";

const BY_JS_DAY: DayOfWeek[] = [
  DayOfWeek.SUN,
  DayOfWeek.MON,
  DayOfWeek.TUE,
  DayOfWeek.WED,
  DayOfWeek.THU,
  DayOfWeek.FRI,
  DayOfWeek.SAT,
];

export function dayOfWeekFromDate(d: Date): DayOfWeek {
  return BY_JS_DAY[d.getDay()];
}
