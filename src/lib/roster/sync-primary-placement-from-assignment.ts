import {
  TeamPlayerPlacementStatus,
  TeamPlayerPlacementType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncPlayerLifecycleFromPlacements } from "@/lib/roster/sync-player-lifecycle";

/** True when `assignedTeamId` moved off a team (switch or pool). */
export function shouldTerminalPreviousPrimaryPlacement(
  fromTeamId: string | null,
  toTeamId: string | null
): boolean {
  return fromTeamId != null && fromTeamId !== toTeamId;
}

/**
 * Keeps PRIMARY `TeamPlayerPlacement` aligned when `Player.assignedTeamId` changes.
 * INVITED = entry state when a player is placed on a team’s roster track (see architecture plan §8).
 */
export async function syncPrimaryPlacementFromAssignedTeamChange(input: {
  playerId: string;
  fromAssignedTeamId: string | null;
  toAssignedTeamId: string | null;
}): Promise<void> {
  const { playerId, fromAssignedTeamId, toAssignedTeamId } = input;

  if (fromAssignedTeamId === toAssignedTeamId) {
    await syncPlayerLifecycleFromPlacements(playerId);
    return;
  }

  if (shouldTerminalPreviousPrimaryPlacement(fromAssignedTeamId, toAssignedTeamId)) {
    await terminalPrimaryPlacementForTeam(playerId, fromAssignedTeamId!);
  }

  if (toAssignedTeamId) {
    await upsertInvitedPrimaryPlacement(playerId, toAssignedTeamId);
  }

  await syncPlayerLifecycleFromPlacements(playerId);
}

/**
 * Clearing assignment / switching teams removes the PRIMARY row so the athlete is back in pool space.
 * Rows already marked NOT_INTERESTED (coach Decline) are kept for audit — only Decline sets that status.
 */
async function terminalPrimaryPlacementForTeam(playerId: string, teamId: string) {
  const row = await prisma.teamPlayerPlacement.findUnique({
    where: {
      playerId_teamId: { playerId, teamId },
    },
  });
  if (!row) return;
  if (row.placementType !== TeamPlayerPlacementType.PRIMARY) return;
  if (row.status === TeamPlayerPlacementStatus.NOT_INTERESTED) return;

  await prisma.teamPlayerPlacement.delete({ where: { id: row.id } });
}

async function upsertInvitedPrimaryPlacement(playerId: string, teamId: string) {
  const existing = await prisma.teamPlayerPlacement.findUnique({
    where: {
      playerId_teamId: { playerId, teamId },
    },
  });

  if (!existing) {
    await prisma.teamPlayerPlacement.create({
      data: {
        playerId,
        teamId,
        status: TeamPlayerPlacementStatus.INVITED,
        placementType: TeamPlayerPlacementType.PRIMARY,
      },
    });
    return;
  }

  if (existing.placementType !== TeamPlayerPlacementType.PRIMARY) return;

  if (
    existing.status === TeamPlayerPlacementStatus.INVITED ||
    existing.status === TeamPlayerPlacementStatus.OFFERED ||
    existing.status === TeamPlayerPlacementStatus.COMMITTED
  ) {
    return;
  }

  if (existing.status === TeamPlayerPlacementStatus.NOT_INTERESTED) {
    await prisma.teamPlayerPlacement.update({
      where: { id: existing.id },
      data: {
        status: TeamPlayerPlacementStatus.INVITED,
        placementType: TeamPlayerPlacementType.PRIMARY,
      },
    });
  }
}
