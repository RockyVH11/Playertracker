type CopyPlayerRow = {
  firstName: string;
  lastName: string;
  gender: "BOYS" | "GIRLS";
  dobUs: string;
  primaryPositionLabel: string;
  secondaryPositionLabel: string;
  assignedTeamName: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
};

type DraftCopyInput = {
  teamName: string;
  locationName: string;
  filters: { locationName: string; sex: string; ageGroup: string; assignment: string };
  counts: { GK: number; D: number; M: number; F: number; U: number };
  players: CopyPlayerRow[];
};

export function formatDraftRosterCopy(input: DraftCopyInput): string {
  return [
    `Team: ${input.teamName} (${input.locationName})`,
    `Filters: Location=${input.filters.locationName} | Sex=${input.filters.sex} | AgeGroup=${input.filters.ageGroup} | Assignment=${input.filters.assignment}`,
    `Counts: GK=${input.counts.GK} D=${input.counts.D} M=${input.counts.M} F=${input.counts.F} U=${input.counts.U}`,
    "",
    "Name | Sex | DOB | Pos | Secondary | AssignedTeam",
    ...input.players.map(
      (p) =>
        `${p.lastName}, ${p.firstName} | ${p.gender === "BOYS" ? "B" : "G"} | ${p.dobUs} | ${p.primaryPositionLabel} | ${p.secondaryPositionLabel} | ${p.assignedTeamName ?? "Unassigned"}`
    ),
  ].join("\n");
}

export function formatRosterContactsCopy(teamName: string, players: CopyPlayerRow[]): string {
  return [
    `Roster contacts: ${teamName}`,
    "",
    "Name | DOB | Phone | Email",
    ...players.map(
      (p) =>
        `${p.lastName}, ${p.firstName} | ${p.dobUs} | ${p.guardianPhone?.trim() || "—"} | ${p.guardianEmail?.trim() || "—"}`
    ),
  ].join("\n");
}

export function formatRosterContactsTsv(teamName: string, players: CopyPlayerRow[]): string {
  return [
    `Roster contacts\t${teamName}`,
    "",
    "Name\tDOB\tPhone\tEmail",
    ...players.map(
      (p) =>
        `${p.lastName}, ${p.firstName}\t${p.dobUs}\t${p.guardianPhone?.trim() || "—"}\t${p.guardianEmail?.trim() || "—"}`
    ),
  ].join("\n");
}
