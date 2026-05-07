import { DayOfWeek } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  createAvailabilityWindowSchema,
  createFieldAvailabilityWindowSchema,
  hmToMinutes,
  updateFieldAvailabilityWindowSchema,
} from "@/lib/validation/fields-availability";

describe("fields-availability validation", () => {
  it("parses valid HH:mm", () => {
    expect(hmToMinutes("18:00")).toBe(18 * 60);
    expect(hmToMinutes("09:30")).toBe(9 * 60 + 30);
    expect(hmToMinutes("23:59")).toBe(23 * 60 + 59);
  });

  it("rejects invalid hm", () => {
    expect(hmToMinutes("24:00")).toBeNull();
    expect(hmToMinutes("18:60")).toBeNull();
  });

  it("requires end after start", () => {
    const bad = createAvailabilityWindowSchema.safeParse({
      complexId: "clxxxxxxxxxxxxxxxxxxxxxxxx",
      dayOfWeek: DayOfWeek.MON,
      startTime: "20:00",
      endTime: "18:00",
      slotMinutes: 30,
    });
    expect(bad.success).toBe(false);
    const good = createAvailabilityWindowSchema.safeParse({
      complexId: "clxxxxxxxxxxxxxxxxxxxxxxxx",
      dayOfWeek: DayOfWeek.MON,
      startTime: "18:00",
      endTime: "21:00",
      slotMinutes: 30,
    });
    expect(good.success).toBe(true);
  });

  it("validates field availability payloads", () => {
    const createOk = createFieldAvailabilityWindowSchema.safeParse({
      fieldId: "clxxxxxxxxxxxxxxxxxxxxxxxx",
      dayOfWeek: DayOfWeek.TUE,
      startTime: "18:00",
      endTime: "20:00",
      slotMinutes: 30,
    });
    expect(createOk.success).toBe(true);

    const updateBad = updateFieldAvailabilityWindowSchema.safeParse({
      fieldAvailabilityId: "clxxxxxxxxxxxxxxxxxxxxxxxx",
      dayOfWeek: DayOfWeek.TUE,
      startTime: "20:00",
      endTime: "18:00",
      slotMinutes: 30,
      isActive: true,
    });
    expect(updateBad.success).toBe(false);
  });
});
