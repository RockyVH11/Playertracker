import { describe, expect, it } from "vitest";
import {
  addTeamAssistantCoachSchema,
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
