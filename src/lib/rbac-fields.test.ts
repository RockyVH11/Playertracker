import { StaffRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canAccessFieldRequestsBoard,
  canManageFieldComplexesForLocation,
  mayAccessEquipment,
  mayAccessFieldInfrastructureAdmin,
  maySubmitFieldTimeRequest,
} from "@/lib/rbac-fields";

describe("field infrastructure RBAC", () => {
  const superSession = { role: "SUPER_ADMIN" as const, coachId: null };
  const coachSession = { role: "COACH" as const, coachId: "c1" };

  it("allows super admin infrastructure admin and any location", () => {
    expect(mayAccessFieldInfrastructureAdmin(superSession, null)).toBe(true);
    expect(
      canManageFieldComplexesForLocation(superSession, null, null, "loc-a")
    ).toBe(true);
  });

  it("allows director when primary location matches", () => {
    expect(
      mayAccessFieldInfrastructureAdmin(coachSession, StaffRole.DIRECTOR)
    ).toBe(true);
    expect(
      canManageFieldComplexesForLocation(
        coachSession,
        StaffRole.DIRECTOR,
        "loc-a",
        "loc-a"
      )
    ).toBe(true);
  });

  it("denies director when primary location mismatches or missing", () => {
    expect(
      canManageFieldComplexesForLocation(
        coachSession,
        StaffRole.DIRECTOR,
        "loc-a",
        "loc-b"
      )
    ).toBe(false);
    expect(
      canManageFieldComplexesForLocation(
        coachSession,
        StaffRole.DIRECTOR,
        null,
        "loc-a"
      )
    ).toBe(false);
  });

  it("denies coach and manager for infrastructure admin", () => {
    expect(mayAccessFieldInfrastructureAdmin(coachSession, StaffRole.COACH)).toBe(
      false
    );
    expect(mayAccessFieldInfrastructureAdmin(coachSession, StaffRole.MANAGER)).toBe(
      false
    );
  });

  it("field request board: super admin and director only", () => {
    expect(canAccessFieldRequestsBoard(superSession, null)).toBe(true);
    expect(canAccessFieldRequestsBoard(coachSession, StaffRole.DIRECTOR)).toBe(true);
    expect(canAccessFieldRequestsBoard(coachSession, StaffRole.COACH)).toBe(false);
  });

  it("field time request: coach and director staff may submit; not manager or super admin", () => {
    expect(maySubmitFieldTimeRequest(coachSession, StaffRole.COACH)).toBe(true);
    expect(maySubmitFieldTimeRequest(coachSession, StaffRole.DIRECTOR)).toBe(true);
    expect(maySubmitFieldTimeRequest(coachSession, StaffRole.MANAGER)).toBe(false);
    expect(maySubmitFieldTimeRequest(superSession, null)).toBe(false);
  });

  it("equipment: same gate as /fields/equipment (super, director, or field-time coaches)", () => {
    expect(mayAccessEquipment(superSession, null)).toBe(true);
    expect(mayAccessEquipment(coachSession, StaffRole.DIRECTOR)).toBe(true);
    expect(mayAccessEquipment(coachSession, StaffRole.COACH)).toBe(true);
    expect(mayAccessEquipment(coachSession, StaffRole.MANAGER)).toBe(false);
  });
});
