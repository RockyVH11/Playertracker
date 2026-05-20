import { describe, expect, it } from "vitest";
import {
  dayIndexAmongRotationDays,
  fieldIdForRotationSlot,
  rotationPhaseIndex,
} from "./field-rotation";
import { parseYmdLocal } from "./local-date";

describe("field rotation", () => {
  const members = [
    { slotIndex: 0, primaryFieldId: "field-a" },
    { slotIndex: 1, primaryFieldId: "field-b" },
  ];

  it("swaps two teams on weekly phase 1", () => {
    expect(fieldIdForRotationSlot(members, 0, 0)).toBe("field-a");
    expect(fieldIdForRotationSlot(members, 1, 0)).toBe("field-b");
    expect(fieldIdForRotationSlot(members, 0, 1)).toBe("field-b");
    expect(fieldIdForRotationSlot(members, 1, 1)).toBe("field-a");
  });

  it("uses day index for DAILY cadence", () => {
    expect(dayIndexAmongRotationDays("TUE", ["TUE", "THU"])).toBe(0);
    expect(dayIndexAmongRotationDays("THU", ["TUE", "THU"])).toBe(1);
    const anchor = parseYmdLocal("2026-05-05");
    const tue = parseYmdLocal("2026-05-06");
    const thu = parseYmdLocal("2026-05-07");
    expect(
      rotationPhaseIndex({
        cadence: "DAILY",
        anchorDate: anchor,
        assignmentDate: tue,
        daysOfWeek: ["TUE", "THU"],
        memberCount: 2,
      })
    ).toBe(0);
    expect(
      rotationPhaseIndex({
        cadence: "DAILY",
        anchorDate: anchor,
        assignmentDate: thu,
        daysOfWeek: ["TUE", "THU"],
        memberCount: 2,
      })
    ).toBe(1);
  });

  it("advances weekly phase by week number", () => {
    const anchor = parseYmdLocal("2026-05-05");
    const week0 = parseYmdLocal("2026-05-06");
    const week1 = parseYmdLocal("2026-05-13");
    expect(
      rotationPhaseIndex({
        cadence: "WEEKLY",
        anchorDate: anchor,
        assignmentDate: week0,
        daysOfWeek: ["TUE"],
        memberCount: 2,
      })
    ).toBe(0);
    expect(
      rotationPhaseIndex({
        cadence: "WEEKLY",
        anchorDate: anchor,
        assignmentDate: week1,
        daysOfWeek: ["TUE"],
        memberCount: 2,
      })
    ).toBe(1);
  });
});
