import { describe, expect, it } from "vitest";
import {
  daysInCalendarMonthContaining,
  daysInWeekStartingSundayContaining,
  formatYmdLocal,
  parseYmdLocal,
  startOfWeekSunday,
} from "@/lib/fields/local-date";

describe("local-date range helpers", () => {
  it("daysInWeekStartingSundayContaining returns 7 days", () => {
    const anchor = parseYmdLocal("2026-05-06"); // Wednesday
    const days = daysInWeekStartingSundayContaining(anchor);
    expect(days).toHaveLength(7);
    expect(formatYmdLocal(startOfWeekSunday(anchor))).toBe(formatYmdLocal(days[0]!));
    expect(formatYmdLocal(days[0]!)).toBe("2026-05-03");
    expect(formatYmdLocal(days[6]!)).toBe("2026-05-09");
  });

  it("daysInCalendarMonthContaining", () => {
    const anchor = parseYmdLocal("2026-05-15");
    const days = daysInCalendarMonthContaining(anchor);
    expect(days).toHaveLength(31);
    expect(formatYmdLocal(days[0]!)).toBe("2026-05-01");
    expect(formatYmdLocal(days[30]!)).toBe("2026-05-31");
  });
});
