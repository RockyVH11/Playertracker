import { StaffRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import type { SessionPayload } from "@/lib/auth/types";
import {
  canAccessProspectDashboard,
  canAssignOrReassignProspect,
  canCoachUpdateProspectAssignmentsOnly,
  canDeleteProspect,
  canViewProspectSensitiveContact,
} from "./rbac";

const superSession: SessionPayload = { role: "SUPER_ADMIN", coachId: null };
const coachSession: SessionPayload = { role: "COACH", coachId: "c1" };

describe("prospect RBAC helpers", () => {
  it("gates the prospect dashboard to directors and super admins", () => {
    expect(canAccessProspectDashboard(superSession, null)).toBe(true);
    expect(canAccessProspectDashboard(coachSession, StaffRole.DIRECTOR)).toBe(true);
    expect(canAccessProspectDashboard(coachSession, StaffRole.COACH)).toBe(false);
  });

  it("lets directors and super admins assign or edit pipeline rows", () => {
    expect(canAssignOrReassignProspect(superSession, null)).toBe(true);
    expect(canAssignOrReassignProspect(coachSession, StaffRole.DIRECTOR)).toBe(true);
    expect(canAssignOrReassignProspect(coachSession, StaffRole.MANAGER)).toBe(false);
  });

  it("restricts deletion to directors and super admins", () => {
    expect(canDeleteProspect(superSession, null)).toBe(true);
    expect(canDeleteProspect(coachSession, StaffRole.DIRECTOR)).toBe(true);
    expect(canDeleteProspect(coachSession, StaffRole.COACH)).toBe(false);
  });

  it("masks sensitive contact for unrelated coach sessions", () => {
    const row = { assignedToCoachId: "other", submittedByCoachId: "submitter" };
    expect(canViewProspectSensitiveContact(superSession, null, null, row)).toBe(true);
    expect(
      canViewProspectSensitiveContact(coachSession, StaffRole.DIRECTOR, "c1", row)
    ).toBe(true);
    expect(
      canViewProspectSensitiveContact(coachSession, StaffRole.COACH, "c1", row)
    ).toBe(false);
    expect(
      canViewProspectSensitiveContact(coachSession, StaffRole.COACH, "c1", {
        ...row,
        assignedToCoachId: "c1",
      })
    ).toBe(true);
    expect(
      canViewProspectSensitiveContact(coachSession, StaffRole.COACH, "c1", {
        ...row,
        submittedByCoachId: "c1",
      })
    ).toBe(true);
  });

  it("lets assignees update limited fields", () => {
    expect(
      canCoachUpdateProspectAssignmentsOnly(coachSession, StaffRole.COACH, "c1", {
        assignedToCoachId: "c1",
      })
    ).toBe(true);
    expect(
      canCoachUpdateProspectAssignmentsOnly(coachSession, StaffRole.DIRECTOR, "c1", {
        assignedToCoachId: "c1",
      })
    ).toBe(false);
  });
});
