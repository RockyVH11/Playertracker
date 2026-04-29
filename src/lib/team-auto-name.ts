import type { Gender } from "@prisma/client";

/** Suffix appended as ` -Black` / ` -Red` for parallel squads. */
export const SQUAD_SUFFIX_BLACK = "Black";
export const SQUAD_SUFFIX_RED = "Red";

export function genderLetter(gender: Gender): "B" | "G" {
  return gender === "GIRLS" ? "G" : "B";
}

/**
 * Auto display name pattern:
 * `{club} {UxG|UxB} {league name tokens…} {CoachLast}`
 * Example: `Kernow Storm U19G N1 NTx D1 Van Husen` when league.name is `N1 NTx D1`.
 */
export function buildAutoTeamBaseName(parts: {
  clubName: string;
  ageGroup: string;
  gender: Gender;
  leagueName: string | null;
  coachLastName: string;
}): string {
  const g = genderLetter(parts.gender);
  const leagueTok =
    parts.leagueName?.trim()?.split(/\s+/).filter((t) => t.length > 0) ?? [];
  const segments = [
    parts.clubName.trim(),
    `${parts.ageGroup.trim()}${g}`,
    ...leagueTok,
    parts.coachLastName.trim(),
  ].filter((s) => s.length > 0);
  return segments.join(" ");
}

export function withSquadSuffix(
  autoBaseWithoutSuffix: string,
  kind: typeof SQUAD_SUFFIX_BLACK | typeof SQUAD_SUFFIX_RED
): string {
  const t = autoBaseWithoutSuffix.trim();
  return `${t} -${kind}`;
}
