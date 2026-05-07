import { describe, expect, it } from "vitest";
import {
  addMinutesToHm,
  assignmentOverlapsSlot,
  hmRangesOverlap,
  minutesToHm,
  rangesOverlapMinutes,
  slotCoveredByAvailabilityWindows,
} from "@/lib/fields/assignment-intervals";

describe("assignment-intervals", () => {
  it("minutesToHm pads hours", () => {
    expect(minutesToHm(90)).toBe("01:30");
    expect(minutesToHm(0)).toBe("00:00");
  });

  it("detects overlap", () => {
    expect(rangesOverlapMinutes(600, 660, 630, 690)).toBe(true);
    expect(rangesOverlapMinutes(600, 630, 630, 660)).toBe(false);
  });

  it("hmRangesOverlap", () => {
    expect(hmRangesOverlap("18:00", "19:00", "18:30", "19:30")).toBe(true);
    expect(hmRangesOverlap("18:00", "18:30", "18:30", "19:00")).toBe(false);
  });

  it("assignmentOverlapsSlot", () => {
    expect(assignmentOverlapsSlot("18:00", "19:30", "18:00", 30)).toBe(true);
    expect(assignmentOverlapsSlot("18:00", "18:30", "19:00", 30)).toBe(false);
  });

  it("addMinutesToHm", () => {
    expect(addMinutesToHm("18:00", 90)).toBe("19:30");
    expect(addMinutesToHm("bad", 10)).toBeNull();
  });

  it("slotCoveredByAvailabilityWindows: empty windows passes", () => {
    expect(slotCoveredByAvailabilityWindows("08:00", 30, [])).toBe(true);
  });

  it("slotCoveredByAvailabilityWindows: rejects slot outside configured hours", () => {
    expect(
      slotCoveredByAvailabilityWindows("08:00", 30, [{ startTime: "18:00", endTime: "22:00" }])
    ).toBe(false);
    expect(
      slotCoveredByAvailabilityWindows("18:00", 30, [{ startTime: "18:00", endTime: "22:00" }])
    ).toBe(true);
  });
});
