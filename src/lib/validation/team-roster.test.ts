import { describe, expect, it } from "vitest";
import {
  addTeamAssistantCoachSchema,
  assignPlayerToTeamRosterSchema,
  removeTeamAssistantCoachSchema,
  returnPrimaryInviteToPoolSchema,
} from "./team-roster";

describe("returnPrimaryInviteToPoolSchema", () => {
  it("rejects malformed ids", () => {
    expect(
      returnPrimaryInviteToPoolSchema.safeParse({
        placementId: "not-a-cuid",
        teamId: "also-bad",
      }).success
    ).toBe(false);
  });
});

describe("addTeamAssistantCoachSchema", () => {
  it("rejects malformed ids", () => {
    expect(
      addTeamAssistantCoachSchema.safeParse({
        teamId: "",
        coachId: "x",
      }).success
    ).toBe(false);
  });

  it("allows empty coachId (no-op add)", () => {
    const r = addTeamAssistantCoachSchema.safeParse({
      teamId: "clabcdefghijklmnopabcdefghijk",
      coachId: "",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.coachId).toBeUndefined();
  });
});

describe("removeTeamAssistantCoachSchema", () => {
  it("allows empty teamCoachId (no-op remove)", () => {
    const r = removeTeamAssistantCoachSchema.safeParse({
      teamId: "clabcdefghijklmnopabcdefghijk",
      teamCoachId: "",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.teamCoachId).toBeUndefined();
  });
});

describe("assignPlayerToTeamRosterSchema", () => {
  it("defaults poolPlacementRole to primary", () => {
    const r = assignPlayerToTeamRosterSchema.safeParse({
      teamId: "clabcdefghijklmnopabcdefghijk",
      playerId: "clabcdefghijklmnopabcdefghijk",
      poolPlacementRole: "",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.poolPlacementRole).toBe("primary");
  });

  it("accepts secondary and guest", () => {
    const s = assignPlayerToTeamRosterSchema.safeParse({
      teamId: "clabcdefghijklmnopabcdefghijk",
      playerId: "clabcdefghijklmnopabcdefghijk",
      poolPlacementRole: "secondary",
    });
    expect(s.success).toBe(true);
    if (s.success) expect(s.data.poolPlacementRole).toBe("secondary");
  });
});
