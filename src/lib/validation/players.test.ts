import { describe, expect, it } from "vitest";
import { Gender, PlayerStatus, EvaluationLevel } from "@prisma/client";
import { parseDobToUtcDate, playerCreateSchema } from "./players";

const base = {
  seasonLabel: "2026-2027",
  firstName: "Pat",
  lastName: "Smith",
  dob: "2014-05-01",
  gender: Gender.BOYS,
  locationId: "loc_1",
  assignedTeamId: null,
  leagueInterestId: null,
  playerStatus: PlayerStatus.AVAILABLE,
  willingToPlayUp: "off" as const,
  overrideAgeGroup: "",
  evaluationLevel: EvaluationLevel.NOT_EVALUATED,
  evaluationNotes: null,
  guardianName: null,
  guardianPhone: null,
  guardianEmail: null,
};

describe("playerCreateSchema", () => {
  it("rejects blank first name after trim", () => {
    const r = playerCreateSchema.safeParse({ ...base, firstName: "   " });
    expect(r.success).toBe(false);
  });

  it("rejects empty date of birth", () => {
    const r = playerCreateSchema.safeParse({ ...base, dob: "" });
    expect(r.success).toBe(false);
  });

  it("rejects empty gender", () => {
    const r = playerCreateSchema.safeParse({ ...base, gender: "" });
    expect(r.success).toBe(false);
  });

  it("accepts minimal valid identity fields", () => {
    const r = playerCreateSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("accepts MM/DD/YYYY date input", () => {
    const r = playerCreateSchema.safeParse({ ...base, dob: "05/01/2014" });
    expect(r.success).toBe(true);
    expect(parseDobToUtcDate("05/01/2014").toISOString().slice(0, 10)).toBe("2014-05-01");
  });
});
