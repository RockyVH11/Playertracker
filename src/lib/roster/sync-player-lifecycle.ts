import { prisma } from "@/lib/prisma";
import { lifecycleFromPlacements } from "@/lib/roster/player-lifecycle";

/** Recompute `Player.playerStatus` (AVAILABLE/ACTIVE) from all placements; preserves ARCHIVED. */
export async function syncPlayerLifecycleFromPlacements(playerId: string): Promise<void> {
  const player = await prisma.player.findFirst({
    where: { id: playerId },
    select: { playerStatus: true },
  });
  if (!player) return;

  const placements = await prisma.teamPlayerPlacement.findMany({
    where: { playerId },
    select: { status: true },
  });

  const next = lifecycleFromPlacements(
    player.playerStatus,
    placements.map((p) => p.status)
  );

  if (next !== player.playerStatus) {
    await prisma.player.update({
      where: { id: playerId },
      data: { playerStatus: next },
    });
  }
}
