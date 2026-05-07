import { describe, expect, it } from "vitest";
import {
  availabilityHullFromRows,
  blackoutIntervalsInHull,
  mergeIntervals,
  netOpenMinutes,
  unionLength,
} from "@/lib/fields/dashboard-metrics";

describe("dashboard-metrics", () => {
  it("availabilityHullFromRows uses default when empty", () => {
    const h = availabilityHullFromRows([]);
    expect(h).toEqual({ startM: 8 * 60, endM: 22 * 60 });
  });

  it("availabilityHullFromRows uses hull of windows", () => {
    const h = availabilityHullFromRows([
      { startTime: "09:00", endTime: "12:00" },
      { startTime: "14:00", endTime: "18:00" },
    ]);
    expect(h).toEqual({ startM: 9 * 60, endM: 18 * 60 });
  });

  it("mergeIntervals merges overlaps", () => {
    expect(
      mergeIntervals([
        { startM: 100, endM: 200 },
        { startM: 150, endM: 250 },
      ])
    ).toEqual([{ startM: 100, endM: 250 }]);
  });

  it("netOpenMinutes subtracts blackout union", () => {
    const hull = { startM: 600, endM: 840 }; // 10:00–14:00
    const blocks = blackoutIntervalsInHull([{ startTime: "10:30", endTime: "11:30" }], hull);
    expect(netOpenMinutes(hull, blocks)).toBe(240 - 60);
  });

  it("all-day blackout clears net open", () => {
    const hull = { startM: 480, endM: 1320 };
    const blocks = blackoutIntervalsInHull([{ startTime: null, endTime: null }], hull);
    expect(unionLength(blocks)).toBe(1320 - 480);
    expect(netOpenMinutes(hull, blocks)).toBe(0);
  });
});
