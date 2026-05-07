import { describe, expect, it } from "vitest";
import {
  createFieldAssignmentFromWizardDropSchema,
  createRecurringFieldAssignmentsSchema,
  moveFieldAssignmentFromWizardDragSchema,
  wizardDeleteFieldAssignmentSchema,
} from "@/lib/validation/field-assignment";

const CUID_A = "cmad4n9pq0001s5w9zyxabcde";
const CUID_B = "cmad4n9pq0002s5w9zyxabcde";
const CUID_C = "cmad4n9pq0003s5w9zyxabcde";

describe("field assignment wizard validation", () => {
  it("accepts drop duration values 30, 60, and 90", () => {
    for (const minutes of [30, 60, 90]) {
      const parsed = createFieldAssignmentFromWizardDropSchema.safeParse({
        locationId: CUID_A,
        complexId: CUID_A,
        teamId: CUID_B,
        fieldId: CUID_C,
        assignmentDate: "2026-05-10",
        startTime: "19:00",
        windowStart: "18:00",
        durationMinutes: String(minutes),
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("rejects unsupported drop duration values", () => {
    const parsed = createFieldAssignmentFromWizardDropSchema.safeParse({
      locationId: CUID_A,
      complexId: CUID_A,
      teamId: CUID_B,
      fieldId: CUID_C,
      assignmentDate: "2026-05-10",
      startTime: "19:00",
      windowStart: "18:00",
      durationMinutes: "45",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires at least one weekday for recurrence", () => {
    const parsed = createRecurringFieldAssignmentsSchema.safeParse({
      locationId: CUID_A,
      complexId: CUID_A,
      assignmentId: CUID_B,
      endDate: "2026-06-01",
      windowStart: "18:00",
      durationMinutes: 60,
      weekdays: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("wizard delete rejects invalid scope", () => {
    const parsed = wizardDeleteFieldAssignmentSchema.safeParse({
      assignmentId: CUID_B,
      scope: "everything",
    });
    expect(parsed.success).toBe(false);
  });

  it("wizard delete accepts this and series scopes", () => {
    expect(
      wizardDeleteFieldAssignmentSchema.safeParse({
        assignmentId: CUID_B,
        scope: "this",
      }).success
    ).toBe(true);
    expect(
      wizardDeleteFieldAssignmentSchema.safeParse({
        assignmentId: CUID_B,
        scope: "series",
      }).success
    ).toBe(true);
  });

  it("wizard move drag requires assignment target payload", () => {
    const ok = moveFieldAssignmentFromWizardDragSchema.safeParse({
      locationId: CUID_A,
      assignmentId: CUID_B,
      fieldId: CUID_C,
      assignmentDate: "2026-06-01",
      startTime: "18:30",
    });
    expect(ok.success).toBe(true);

    const bad = moveFieldAssignmentFromWizardDragSchema.safeParse({
      locationId: CUID_A,
      assignmentId: CUID_B,
      fieldId: CUID_C,
      assignmentDate: "06-01-2026",
      startTime: "18:30",
    });
    expect(bad.success).toBe(false);
  });
});

