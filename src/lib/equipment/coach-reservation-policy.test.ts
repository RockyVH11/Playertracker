import { describe, expect, it } from "vitest";
import { isReservationDateInCurrentLocalWeek } from "@/lib/equipment/coach-reservation-policy";
import { parseYmdLocal } from "@/lib/fields/local-date";

describe("coach-reservation-policy", () => {
  it("accepts days inside the current week", () => {
    const today = parseYmdLocal("2026-06-10"); // Wednesday
    const wed = parseYmdLocal("2026-06-10");
    const sun = parseYmdLocal("2026-06-07");
    const sat = parseYmdLocal("2026-06-13");
    expect(isReservationDateInCurrentLocalWeek(today, wed)).toBe(true);
    expect(isReservationDateInCurrentLocalWeek(today, sun)).toBe(true);
    expect(isReservationDateInCurrentLocalWeek(today, sat)).toBe(true);
  });

  it("rejects days outside the week", () => {
    const today = parseYmdLocal("2026-06-10");
    expect(isReservationDateInCurrentLocalWeek(today, parseYmdLocal("2026-06-06"))).toBe(false);
    expect(isReservationDateInCurrentLocalWeek(today, parseYmdLocal("2026-06-14"))).toBe(false);
  });
});
