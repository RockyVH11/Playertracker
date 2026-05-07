import { describe, expect, it } from "vitest";
import {
  formatDraftRosterCopy,
  formatRosterContactsCopy,
  formatRosterContactsTsv,
} from "@/lib/dashboard/team-building-copy";

describe("team building copy formatters", () => {
  it("formats draft roster copy text", () => {
    const out = formatDraftRosterCopy({
      teamName: "U13 Blue",
      locationName: "North",
      filters: { locationName: "North", sex: "BOYS", ageGroup: "U13", assignment: "all" },
      counts: { GK: 1, D: 2, M: 3, F: 2, U: 1 },
      players: [
        {
          firstName: "Alex",
          lastName: "Stone",
          gender: "BOYS",
          dobUs: "04/10/2013",
          primaryPositionLabel: "GK",
          secondaryPositionLabel: "U",
          assignedTeamName: "U13 Blue",
        },
      ],
    });
    expect(out).toContain("Team: U13 Blue (North)");
    expect(out).toContain("Counts: GK=1 D=2 M=3 F=2 U=1");
    expect(out).toContain("Stone, Alex | B | 04/10/2013 | GK | U | U13 Blue");
  });

  it("formats roster contacts with empty fallback values", () => {
    const out = formatRosterContactsCopy("U13 Blue", [
      {
        firstName: "Jamie",
        lastName: "Cole",
        gender: "GIRLS",
        dobUs: "06/02/2013",
        primaryPositionLabel: "M",
        secondaryPositionLabel: "F",
        assignedTeamName: "U13 Blue",
        guardianPhone: "",
        guardianEmail: null,
      },
    ]);
    expect(out).toContain("Roster contacts: U13 Blue");
    expect(out).toContain("Cole, Jamie | 06/02/2013 | — | —");
  });

  it("formats roster contacts as tab-separated output", () => {
    const out = formatRosterContactsTsv("U13 Blue", [
      {
        firstName: "Jamie",
        lastName: "Cole",
        gender: "GIRLS",
        dobUs: "06/02/2013",
        primaryPositionLabel: "M",
        secondaryPositionLabel: "F",
        assignedTeamName: "U13 Blue",
        guardianPhone: "555-1234",
        guardianEmail: "jamie@example.com",
      },
    ]);
    expect(out).toContain("Name\tDOB\tPhone\tEmail");
    expect(out).toContain("Cole, Jamie\t06/02/2013\t555-1234\tjamie@example.com");
  });
});
