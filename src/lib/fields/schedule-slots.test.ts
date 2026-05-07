import { describe, expect, it } from "vitest";
import { buildSlotStartsFromAvailabilityWindows, generateSlotStarts } from "@/lib/fields/schedule-slots";

describe("generateSlotStarts", () => {
  it("generates 30m starts within window", () => {
    expect(generateSlotStarts("18:00", "19:30", 30)).toEqual(["18:00", "18:30", "19:00"]);
  });
});

describe("buildSlotStartsFromAvailabilityWindows", () => {
  it("preserves gaps between availability windows", () => {
    const out = buildSlotStartsFromAvailabilityWindows(
      [
        { startTime: "06:00", endTime: "07:00" },
        { startTime: "09:00", endTime: "10:00" },
      ],
      30
    );
    expect(out).toEqual(["06:00", "06:30", "09:00", "09:30"]);
  });
});
