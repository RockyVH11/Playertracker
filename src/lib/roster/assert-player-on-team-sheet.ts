import { prisma } from "@/lib/prisma";
import { isPlayerEligibleForTeamPool } from "@/lib/roster/team-roster-pool-eligibility";

/**
 * True when the player is part of this team’s roster context — either because they already have any
 * placement row for the team or because they qualify for the squad’s recruiting pool sheet.
 */
export async function playerIsLinkedToTeamRoster(teamId: string, playerId: string): Promise<boolean> {
  const placement = await prisma.teamPlayerPlacement.findFirst({
    where: { teamId, playerId },
    select: { id: true },
  });
  if (placement) return true;

  const [team, player] = await Promise.all([
    prisma.team.findFirst({
      where: { id: teamId },
      select: { locationId: true, gender: true, ageGroup: true, seasonLabel: true },
    }),
    prisma.player.findFirst({
      where: { id: playerId },
      select: {
        locationId: true,
        gender: true,
        derivedAgeGroup: true,
        overrideAgeGroup: true,
        assignedTeamId: true,
        seasonLabel: true,
      },
    }),
  ]);

  if (!team || !player) return false;
  if (player.seasonLabel !== team.seasonLabel) return false;
  if (player.locationId !== team.locationId) return false;
  if (player.assignedTeamId !== null) return false;

  return isPlayerEligibleForTeamPool(
    {
      gender: player.gender,
      effectiveAgeGroupLabel: player.overrideAgeGroup ?? player.derivedAgeGroup,
    },
    { gender: team.gender, ageGroup: team.ageGroup }
  );
}
