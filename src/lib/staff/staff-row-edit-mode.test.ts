import { StaffRole } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { describe, expect, it } from "vitest";
import { staffRowEditMode } from "./staff-row-edit-mode";

const superAdmin: SessionPayload = { role: "SUPER_ADMIN", coachId: null };
const jamieCoach: SessionPayload = { role: "COACH", coachId: "jamie-id" };

describe("staffRowEditMode", () => {
  it("grants super admin full edits", () => {
    expect(
      staffRowEditMode(superAdmin, {
        viewerStaffRole: null,
        viewerCoachId: null,
        targetCoachId: "any-id",
      })
    ).toBe("full");
  });

  it("lets coach/manager edit only own contact rows", () => {
    expect(
      staffRowEditMode(jamieCoach, {
        viewerStaffRole: StaffRole.COACH,
        viewerCoachId: "jamie-id",
        targetCoachId: "jamie-id",
      })
    ).toBe("contact_only");
  });

  it("lets directors edit any row fully", () => {
    expect(
      staffRowEditMode(jamieCoach, {
        viewerStaffRole: StaffRole.DIRECTOR,
        viewerCoachId: "jamie-id",
        targetCoachId: "other-id",
      })
    ).toBe("full");
  });

  it("blocks coach/manager from editing others", () => {
    expect(
      staffRowEditMode(jamieCoach, {
        viewerStaffRole: StaffRole.MANAGER,
        viewerCoachId: "jamie-id",
        targetCoachId: "other-id",
      })
    ).toBe("none");
  });
});
