import type { Gender } from "@prisma/client";
import { ageGroupRank } from "@/lib/data/age-group-range";

export type PoolEligibilityTeam = {
  gender: Gender;
  ageGroup: string;
};

export type PoolEligibilityPlayer = {
  gender: Gender;
  /** Effective cohort label e.g. U12 — override or derived */
  effectiveAgeGroupLabel: string;
};

/**
 * Pool eligibility for "My Team" player pool (sex + age vs team).
 *
 * Rules:
 * - Boys cannot join girls teams.
 * - Girls may appear on boys or girls teams.
 * - No play-down: player effective age rank must not exceed team age rank (may play up).
 */
export function isPlayerEligibleForTeamPool(
  player: PoolEligibilityPlayer,
  team: PoolEligibilityTeam
): boolean {
  if (team.gender === "GIRLS" && player.gender === "BOYS") {
    return false;
  }

  const pr = ageGroupRank(player.effectiveAgeGroupLabel);
  const tr = ageGroupRank(team.ageGroup);
  if (pr === null || tr === null) return true;

  return pr <= tr;
}
