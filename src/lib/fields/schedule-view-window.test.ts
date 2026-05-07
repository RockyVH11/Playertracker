import { describe, expect, it } from "vitest";
import {
  indexFirstSlotAtOrAfter,
  viewportRowCount,
} from "@/lib/fields/schedule-view-window";

describe("schedule-view-window", () => {
  it("indexFirstSlotAtOrAfter finds first evening slot", () => {
    const slots = ["08:00", "08:30", "17:30", "18:00", "18:30"];
    expect(indexFirstSlotAtOrAfter(slots, "18:00")).toBe(3);
  });

  it("indexFirstSlotAtOrAfter returns 0 when nothing matches", () => {
    const slots = ["08:00", "09:00"];
    expect(indexFirstSlotAtOrAfter(slots, "18:00")).toBe(0);
  });

  it("viewportRowCount", () => {
    expect(viewportRowCount(4, 30)).toBe(8);
    expect(viewportRowCount(4, 60)).toBe(4);
  });
});
