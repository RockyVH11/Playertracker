/**
 * Club youth age labels for teams and filters: U6–U17, then U19 (no U18 in list).
 */
export const YOUTH_AGE_GROUPS = [
  ...Array.from({ length: 12 }, (_, i) => `U${i + 6}`), // U6 … U17
  "U19",
] as const;

export type YouthAgeGroup = (typeof YOUTH_AGE_GROUPS)[number];

export function isYouthAgeGroup(s: string): boolean {
  return (YOUTH_AGE_GROUPS as readonly string[]).includes(s.trim());
}
