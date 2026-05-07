import { describe, expect, it } from "vitest";
import {
  dayIndexInWeek as idx,
  destDateForCopiedAssignment as mapDest,
  sameWeek,
} from "@/lib/fields/copy-week-map";
import { formatYmdLocal, parseYmdLocal, startOfWeekSunday } from "@/lib/fields/local-date";

describe("copy-week-map", () => {
  it("dayIndexInWeek is 0–6 relative to Sunday start", () => {
    const sun = parseYmdLocal("2026-05-03"); // Sunday
    const ws = startOfWeekSunday(sun);
    expect(idx(ws, parseYmdLocal("2026-05-03"))).toBe(0);
    expect(idx(ws, parseYmdLocal("2026-05-09"))).toBe(6);
  });

  it("destDateForCopiedAssignment preserves weekday offset", () => {
    const srcWeek = startOfWeekSunday(parseYmdLocal("2026-05-06"));
    const dstWeek = startOfWeekSunday(parseYmdLocal("2026-05-20"));
    const wedSrc = parseYmdLocal("2026-05-06"); // Wed of first week
    const wedDst = mapDest(srcWeek, dstWeek, wedSrc);
    expect(formatYmdLocal(wedDst)).toBe("2026-05-20");
  });

  it("sameWeek", () => {
    const a = startOfWeekSunday(parseYmdLocal("2026-05-06"));
    const b = startOfWeekSunday(parseYmdLocal("2026-05-08"));
    expect(sameWeek(a, b)).toBe(true);
  });
});
