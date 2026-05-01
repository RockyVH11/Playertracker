import { YOUTH_AGE_GROUPS } from "@/lib/data/age-groups";

/** Numeric rank for standard labels U6–U17 and U19 (e.g. U13 → 13). */
export function ageGroupRank(label: string): number | null {
  const m = /^U(\d{1,2})$/i.exec(label.trim());
  if (!m) return null;
  return Number(m[1]);
}

/**
 * Returns standard age labels whose rank lies between min and max (inclusive).
 * Blank min → from U6; blank max → through U19. Swaps if min rank > max rank.
 */
export function ageGroupsBetween(
  minLabel: string | undefined,
  maxLabel: string | undefined
): string[] | undefined {
  const hasMin = !!(minLabel && minLabel.trim());
  const hasMax = !!(maxLabel && maxLabel.trim());
  if (!hasMin && !hasMax) return undefined;

  const first = YOUTH_AGE_GROUPS[0];
  const last = YOUTH_AGE_GROUPS[YOUTH_AGE_GROUPS.length - 1];
  const minR = hasMin ? ageGroupRank(minLabel!.trim()) : ageGroupRank(first);
  const maxR = hasMax ? ageGroupRank(maxLabel!.trim()) : ageGroupRank(last);
  if (minR === null || maxR === null) return undefined;

  const lo = Math.min(minR, maxR);
  const hi = Math.max(minR, maxR);
  return YOUTH_AGE_GROUPS.filter((ag) => {
    const r = ageGroupRank(ag);
    return r !== null && r >= lo && r <= hi;
  });
}
