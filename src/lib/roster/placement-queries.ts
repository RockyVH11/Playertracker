import {
  TeamCoachRole,
  TeamPlayerPlacementStatus,
  TeamPlayerPlacementType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function findCommittedPrimaryPlacement(playerId: string) {
  return prisma.teamPlayerPlacement.findFirst({
    where: {
      playerId,
      status: TeamPlayerPlacementStatus.COMMITTED,
      placementType: TeamPlayerPlacementType.PRIMARY,
    },
    include: {
      team: {
        select: {
          id: true,
          teamName: true,
          coachId: true,
          locationId: true,
        },
      },
    },
  });
}

/** Offered primary pipeline row on a team other than `excludeTeamId`. */
export async function findOfferedPrimaryElsewhere(
  playerId: string,
  excludeTeamId: string
) {
  return prisma.teamPlayerPlacement.findFirst({
    where: {
      playerId,
      teamId: { not: excludeTeamId },
      status: TeamPlayerPlacementStatus.OFFERED,
      placementType: TeamPlayerPlacementType.PRIMARY,
    },
  });
}

export async function findHeadCoachIdForTeam(teamId: string): Promise<string | null> {
  const row = await prisma.teamCoach.findFirst({
    where: { teamId, role: TeamCoachRole.HEAD_COACH },
    select: { coachId: true },
  });
  if (row) return row.coachId;
  const team = await prisma.team.findFirst({
    where: { id: teamId },
    select: { coachId: true },
  });
  return team?.coachId ?? null;
}
