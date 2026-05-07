import { describe, expect, it } from "vitest";
import { wizardEquipmentDropOnAssignmentSchema } from "@/lib/validation/equipment";

describe("wizardEquipmentDropOnAssignmentSchema", () => {
  it("defaults missing quantity to 1", () => {
    const r = wizardEquipmentDropOnAssignmentSchema.safeParse({
      locationId: "loc_x",
      equipmentItemId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      fieldAssignmentId: "clzzzzzzzzzzzzzzzzzzzzzzz",
      quantity: "",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.quantity).toBe(1);
  });

  it("coerces string quantity", () => {
    const r = wizardEquipmentDropOnAssignmentSchema.safeParse({
      locationId: "loc_x",
      equipmentItemId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      fieldAssignmentId: "clzzzzzzzzzzzzzzzzzzzzzzz",
      quantity: "2",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.quantity).toBe(2);
  });
});
