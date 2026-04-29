import { describe, expect, it } from "vitest";
import { Gender } from "@prisma/client";
import { buildAutoTeamBaseName, withSquadSuffix, SQUAD_SUFFIX_BLACK } from "./team-auto-name";

describe("team-auto-name", () => {
  it("builds Kernow Storm style names from league pathway tokens + coach last", () => {
    const s = buildAutoTeamBaseName({
      clubName: "Kernow Storm",
      ageGroup: "U19",
      gender: Gender.GIRLS,
      leagueName: "N1 NTx D1",
      coachLastName: "Van Husen",
    });
    expect(s).toBe("Kernow Storm U19G N1 NTx D1 Van Husen");
  });

  it("supports -Black squad suffix convention", () => {
    const base = buildAutoTeamBaseName({
      clubName: "Kernow Storm",
      ageGroup: "U19",
      gender: Gender.BOYS,
      leagueName: "API",
      coachLastName: "Smith",
    });
    expect(withSquadSuffix(base, SQUAD_SUFFIX_BLACK)).toBe(`${base} -Black`);
  });
});
