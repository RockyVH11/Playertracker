import { describe, expect, it } from "vitest";
import { clampSlotWindowStart } from "@/lib/fields/clamp-slot-window";

describe("clampSlotWindowStart", () => {
  it("drops stale URLs that reference slots outside operating hours", () => {
    const slots = ["18:00", "18:30", "19:00"];
    expect(clampSlotWindowStart(slots, "08:00")).toBe("18:00");
  });

  it("keeps a valid requested slot", () => {
    expect(clampSlotWindowStart(["18:00", "18:30"], "18:30")).toBe("18:30");
  });
});
