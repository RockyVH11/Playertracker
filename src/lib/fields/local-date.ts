/** Avoid UTC midnight shifts when parsing calendar dates in the club's local TZ. */
export function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Week starts Sunday (matches `DayOfWeek` enum ordering). */
export function startOfWeekSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
}

export function addDaysLocal(d: Date, delta: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  x.setDate(x.getDate() + delta);
  return x;
}

/** Every calendar day in the month containing `d` (local), each at noon. */
export function daysInCalendarMonthContaining(d: Date): Date[] {
  const y = d.getFullYear();
  const m = d.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return Array.from(
    { length: last },
    (_, i) => new Date(y, m, i + 1, 12, 0, 0, 0)
  );
}

/** Seven days starting Sunday for the week that contains `d`. */
export function daysInWeekStartingSundayContaining(d: Date): Date[] {
  const start = startOfWeekSunday(d);
  return Array.from({ length: 7 }, (_, i) => addDaysLocal(start, i));
}
