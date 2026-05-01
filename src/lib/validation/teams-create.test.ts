import { describe, expect, it } from "vitest";
import { Gender } from "@prisma/client";
import { teamCreateFieldsWithoutNameSchema, teamCreateSchema } from "./teams";

describe("teamCreateSchema (browser / draft tolerant)", () => {
  const baseFields = {
    seasonLabel: "2026-2027",
    locationId: "clxxxxxxxxxxxxxxxxxxxxxxxxx".replace(/x/g, "a"),
    gender: Gender.BOYS as const,
    ageGroup: "U6",
    coachId: "clbbbbbbbbbbbbbbbbbbbbbbbbb".replace(/b/g, "c"),
    leagueId: null as string | null,
    recruitingNeeds: null as string | null,
    notes: null as string | null,
  };

  it("parses typical form openSession strings", () => {
    const r = teamCreateFieldsWithoutNameSchema.safeParse({
      ...baseFields,
      coachId: "clxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      locationId: "clyyyyyyyyyyyyyyyyyyyyyyyyyyy",
      openSession: "on",
      committedPlayerCount: 0,
      coachEstimatedPlayerCount: 0,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.openSession).toBe(true);
  });

  it("parses openSession booleans from squad-draft cookie JSON", () => {
    const r = teamCreateFieldsWithoutNameSchema.safeParse({
      ...baseFields,
      coachId: "clxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      locationId: "clyyyyyyyyyyyyyyyyyyyyyyyyyyy",
      openSession: false,
      committedPlayerCount: 0,
      coachEstimatedPlayerCount: 0,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.openSession).toBe(false);
  });

  it("strips unknown keys instead of rejecting (Next form extras)", () => {
    const r = teamCreateSchema.safeParse({
      ...baseFields,
      coachId: "clxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      locationId: "clyyyyyyyyyyyyyyyyyyyyyyyyyyy",
      teamName: "Test U6B Coach",
      openSession: "off",
      committedPlayerCount: 0,
      coachEstimatedPlayerCount: 0,
      $unsupportedKey: "x",
    } as Record<string, unknown>);
    expect(r.success).toBe(true);
    if (r.success) expect("$unsupportedKey" in r.data).toBe(false);
  });
});
