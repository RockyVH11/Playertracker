import { PlayerStatus } from "@prisma/client";

const CURRENT = new Set<string>(Object.values(PlayerStatus));

/**
 * Legacy `Player.playerStatus` values from the initial schema (pre–My Team roster).
 * Recruiting pipeline detail now lives on `TeamPlayerPlacement`; lifecycle is narrowed.
 */
const LEGACY_TO_LIFECYCLE: Record<string, PlayerStatus> = {
  INVITED: PlayerStatus.ACTIVE,
  COMMITTED: PlayerStatus.ACTIVE,
  NOT_INTERESTED: PlayerStatus.ARCHIVED,
};

/**
 * Maps bookmarked or stale query params to the current `PlayerStatus` enum.
 * Unknown strings are ignored (treated as no filter).
 */
export function normalizeLegacyPlayerStatusQueryParam(
  raw: string | undefined
): PlayerStatus | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const v = raw.trim();
  if (CURRENT.has(v)) return v as PlayerStatus;
  return LEGACY_TO_LIFECYCLE[v];
}
