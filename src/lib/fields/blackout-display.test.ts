import { describe, expect, it } from "vitest";
import { blackoutAppliesToField, blackoutBlocksSlot } from "@/lib/fields/blackout-display";

describe("blackout display", () => {
  it("complex-wide applies to every field in complex", () => {
    expect(
      blackoutAppliesToField(
        { complexId: "c1", fieldId: null },
        { id: "f1", complexId: "c1" }
      )
    ).toBe(true);
    expect(
      blackoutAppliesToField(
        { complexId: "c1", fieldId: null },
        { id: "f2", complexId: "c2" }
      )
    ).toBe(false);
  });

  it("field-specific applies to one field", () => {
    expect(
      blackoutAppliesToField(
        { complexId: "c1", fieldId: "f1" },
        { id: "f1", complexId: "c1" }
      )
    ).toBe(true);
    expect(
      blackoutAppliesToField(
        { complexId: "c1", fieldId: "f1" },
        { id: "f2", complexId: "c1" }
      )
    ).toBe(false);
  });

  it("all-day blackout blocks slot", () => {
    expect(blackoutBlocksSlot({ startTime: null, endTime: null }, "18:00", 30)).toBe(true);
  });

  it("partial blackout overlaps slot", () => {
    expect(blackoutBlocksSlot({ startTime: "18:00", endTime: "19:00" }, "18:30", 30)).toBe(true);
    expect(blackoutBlocksSlot({ startTime: "18:00", endTime: "18:30" }, "19:00", 30)).toBe(false);
  });
});
