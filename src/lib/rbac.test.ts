import { describe, expect, it } from "vitest";
import {
  canViewPlayerContact,
  canEditPlayer,
  canDeletePlayer,
  canDeleteTeamOwnedByCoach,
} from "./rbac";

describe("contact visibility", () => {
  it("allows super admin", () => {
    expect(
      canViewPlayerContact(
        { role: "SUPER_ADMIN", coachId: null },
        { createdByCoachId: null, assignedTeam: null }
      )
    ).toBe(true);
  });

  it("allows creator coach", () => {
    expect(
      canViewPlayerContact(
        { role: "COACH", coachId: "c1" },
        { createdByCoachId: "c1", assignedTeam: null }
      )
    ).toBe(true);
  });

  it("allows assigned team coach", () => {
    expect(
      canViewPlayerContact(
        { role: "COACH", coachId: "c1" },
        { createdByCoachId: null, assignedTeam: { coachId: "c1" } }
      )
    ).toBe(true);
  });

  it("denies unrelated coach", () => {
    expect(
      canViewPlayerContact(
        { role: "COACH", coachId: "c1" },
        { createdByCoachId: "c2", assignedTeam: { coachId: "c3" } }
      )
    ).toBe(false);
  });
});

describe("edit player", () => {
  it("denies coach without ownership", () => {
    expect(
      canEditPlayer(
        { role: "COACH", coachId: "c1" },
        { createdByCoachId: "c2", assignedTeam: { coachId: "c3" } }
      )
    ).toBe(false);
  });
});

describe("delete helpers", () => {
  const ownerRow = {
    createdByCoachId: "c1",
    assignedTeam: { coachId: "c9" },
  };

  it("mirrors edit rights for deleting players", () => {
    expect(canDeletePlayer({ role: "COACH", coachId: "c1" }, ownerRow)).toBe(true);
    expect(canDeletePlayer({ role: "COACH", coachId: "c9" }, ownerRow)).toBe(true);
    expect(canDeletePlayer({ role: "COACH", coachId: "c2" }, ownerRow)).toBe(false);
  });

  it("lets coaches delete only their coached teams (or super admins any)", () => {
    expect(canDeleteTeamOwnedByCoach({ role: "SUPER_ADMIN", coachId: null }, "any")).toBe(true);
    expect(canDeleteTeamOwnedByCoach({ role: "COACH", coachId: "c1" }, "c1")).toBe(true);
    expect(canDeleteTeamOwnedByCoach({ role: "COACH", coachId: "c1" }, "c2")).toBe(false);
  });
});
