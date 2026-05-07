import { describe, expect, it } from "vitest";
import { createFieldBlackoutSchema } from "@/lib/validation/field-blackout";

describe("createFieldBlackoutSchema", () => {
  const base = {
    complexId: "clxaaaaaaaaaaaaaaaaaaaaaa",
    fieldId: "",
    blackoutDate: "2026-05-10",
    startTime: "",
    endTime: "",
    reason: "",
  };

  it("accepts all-day when both times empty", () => {
    const r = createFieldBlackoutSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.startTime).toBeNull();
      expect(r.data.endTime).toBeNull();
    }
  });

  it("rejects one-sided times", () => {
    const r = createFieldBlackoutSchema.safeParse({ ...base, startTime: "18:00", endTime: "" });
    expect(r.success).toBe(false);
  });

  it("accepts a bounded window", () => {
    const r = createFieldBlackoutSchema.safeParse({
      ...base,
      startTime: "18:00",
      endTime: "21:00",
    });
    expect(r.success).toBe(true);
  });
});
