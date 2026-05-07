import { describe, expect, it } from "vitest";
import { copyComplexDaySchema } from "@/lib/validation/field-assignment-copy-day";

const LOC = "cmad4n9pq0001s5w9zyxabcde";
const CMP = "cmad4n9pq0002s5w9zyxabcde";

describe("copyComplexDaySchema", () => {
  it("accepts single-day copy without recurrence end", () => {
    const r = copyComplexDaySchema.safeParse({
      locationId: LOC,
      complexId: CMP,
      sourceDate: "2026-05-06",
      destDate: "2026-05-13",
      recurrenceEndDate: "",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.recurrenceEndDate).toBeUndefined();
  });

  it("rejects recurrence end before dest date", () => {
    const r = copyComplexDaySchema.safeParse({
      locationId: LOC,
      complexId: CMP,
      sourceDate: "2026-05-06",
      destDate: "2026-05-20",
      recurrenceEndDate: "2026-05-13",
    });
    expect(r.success).toBe(false);
  });
});
