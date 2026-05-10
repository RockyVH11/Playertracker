import { describe, expect, it } from "vitest";
import {
  addTeamAssistantCoachSchema,
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
});
