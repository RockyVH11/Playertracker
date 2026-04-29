import { describe, expect, it } from "vitest";
import { canViewPlayerContact, canEditPlayer } from "./rbac";

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
