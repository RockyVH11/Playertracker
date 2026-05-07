import { StaffRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canAssignPlayerToTeam, canUnassignPlayer } from "@/lib/rbac-team-building";

describe("team building RBAC", () => {
  const player = {
    locationId: "loc-1",
    assignedTeam: { coachId: "coach-2", locationId: "loc-1" },
  };
  const targetTeam = { coachId: "coach-1", locationId: "loc-1" };

  it("allows super admin for assign and unassign", () => {
    const viewer = {
      session: { role: "SUPER_ADMIN", coachId: null as null },
      viewerStaffRole: null,
      primaryLocationId: null,
    };
    expect(canAssignPlayerToTeam(viewer, player, targetTeam)).toBe(true);
    expect(canUnassignPlayer(viewer, player)).toBe(true);
  });

  it("allows director only within primary location", () => {
    const viewer = {
      session: { role: "COACH" as const, coachId: "dir-1" },
      viewerStaffRole: StaffRole.DIRECTOR,
      primaryLocationId: "loc-1",
    };
    expect(canAssignPlayerToTeam(viewer, player, targetTeam)).toBe(true);
    expect(canUnassignPlayer(viewer, player)).toBe(true);
    expect(
      canAssignPlayerToTeam(viewer, { ...player, locationId: "loc-2" }, { ...targetTeam, locationId: "loc-2" })
    ).toBe(false);
  });

  it("allows coach only for their own team ownership", () => {
    const viewer = {
      session: { role: "COACH" as const, coachId: "coach-1" },
      viewerStaffRole: StaffRole.COACH,
      primaryLocationId: "loc-1",
    };
    expect(canAssignPlayerToTeam(viewer, player, targetTeam)).toBe(true);
    expect(canAssignPlayerToTeam(viewer, player, { coachId: "coach-x", locationId: "loc-1" })).toBe(false);
    expect(canUnassignPlayer(viewer, player)).toBe(false);
    expect(
      canUnassignPlayer(viewer, {
        locationId: "loc-1",
        assignedTeam: { coachId: "coach-1", locationId: "loc-1" },
      })
    ).toBe(true);
  });
});
