import { PlayerStatus, TeamPlayerPlacementStatus } from "@prisma/client";

/** Terminal placement statuses — player lifecycle ignores these when deciding ACTIVE vs AVAILABLE. */
export const TERMINAL_PLACEMENT_STATUSES: readonly TeamPlayerPlacementStatus[] = [
  TeamPlayerPlacementStatus.NOT_INTERESTED,
];

export function isTerminalPlacementStatus(status: TeamPlayerPlacementStatus): boolean {
  return TERMINAL_PLACEMENT_STATUSES.includes(status);
}

export function hasNonTerminalPlacement(
  statuses: Iterable<TeamPlayerPlacementStatus>
): boolean {
  for (const s of statuses) {
    if (!isTerminalPlacementStatus(s)) return true;
  }
  return false;
}

/**
 * Computes lifecycle status from placement rows (any team).
 * ARCHIVED on the player row is preserved — never auto-unarchived here.
 */
export function lifecycleFromPlacements(
  currentLifecycle: PlayerStatus,
  placementStatuses: TeamPlayerPlacementStatus[]
): PlayerStatus {
  if (currentLifecycle === PlayerStatus.ARCHIVED) return PlayerStatus.ARCHIVED;
  return hasNonTerminalPlacement(placementStatuses)
    ? PlayerStatus.ACTIVE
    : PlayerStatus.AVAILABLE;
}
