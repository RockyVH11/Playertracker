import { addDaysLocal, formatYmdLocal, startOfWeekSunday } from "@/lib/fields/local-date";

function noon(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0).getTime();
}

/** Whether `day` falls in the Sunday–Saturday week that contains `today` (local calendar). */
export function isReservationDateInCurrentLocalWeek(today: Date, reservationDate: Date): boolean {
  const ws = startOfWeekSunday(today);
  const start = noon(ws);
  const end = noon(addDaysLocal(ws, 6));
  const d = noon(reservationDate);
  return d >= start && d <= end;
}
