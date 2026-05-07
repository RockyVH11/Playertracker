import { describe, expect, it } from "vitest";
import { validateCloneBatch } from "@/lib/fields/copy-week-validate";

describe("validateCloneBatch", () => {
  it("allows non-overlapping clones", () => {
    expect(
      validateCloneBatch([], [
        { fieldId: "f1", teamId: "t1", startTime: "18:00", endTime: "19:00" },
        { fieldId: "f2", teamId: "t1", startTime: "19:00", endTime: "20:00" },
      ])
    ).toBeNull();
  });

  it("rejects overlap within batch on same field", () => {
    const msg = validateCloneBatch([], [
      { fieldId: "f1", teamId: "t1", startTime: "18:00", endTime: "20:00" },
      { fieldId: "f1", teamId: "t2", startTime: "19:00", endTime: "21:00" },
    ]);
    expect(msg).toContain("That field already has");
  });

  it("rejects overlap within batch for same team", () => {
    const msg = validateCloneBatch([], [
      { fieldId: "f1", teamId: "t1", startTime: "18:00", endTime: "19:00" },
      { fieldId: "f2", teamId: "t1", startTime: "18:30", endTime: "19:30" },
    ]);
    expect(msg).toContain("That team already has");
  });
});
