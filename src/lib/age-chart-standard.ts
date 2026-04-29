import { Gender } from "@prisma/client";
import { YOUTH_AGE_GROUPS } from "@/lib/data/age-groups";

/** Aug 1 / Jul 31 at noon UTC for stable compares and YMD formatting. */
function utcMidday(y: number, month: number, day: number): Date {
  return new Date(Date.UTC(y, month - 1, day, 12, 0, 0, 0));
}

/**
 * Parses the membership-year start calendar year from labels like `2026-2027`.
 * Uses the first four digits as August of that membership year (USYS-style).
 */
export function parseSeasonStartYear(seasonLabel: string): number {
  const m = /^(\d{4})-\d{4}$/.exec(seasonLabel.trim());
  if (!m) throw new Error(`Season must be YYYY-YYYY, got "${seasonLabel}"`);
  return Number(m[1]);
}

/** e.g. `2026-2027` → `2027-2028` */
export function nextSeasonLabel(seasonLabel: string): string {
  const m = /^(\d{4})-(\d{4})$/.exec(seasonLabel.trim());
  if (!m) throw new Error(`Season must be YYYY-YYYY, got "${seasonLabel}"`);
  const a = Number(m[1]) + 1;
  const b = Number(m[2]) + 1;
  return `${a}-${b}`;
}

/**
 * Club standard cohort windows (membership Aug 1 – Jul 31):
 * U6–U17: single-year spans; U19: two-year span only (Aug 1 of year S−19 through Jul 31 of year S−17).
 */
export function dobRangeForStandardAgeGroup(
  seasonStartYear: number,
  ageGroup: string
): { dobStart: Date; dobEnd: Date } {
  if (ageGroup === "U19") {
    return {
      dobStart: utcMidday(seasonStartYear - 19, 8, 1),
      dobEnd: utcMidday(seasonStartYear - 17, 7, 31),
    };
  }
  const m = /^U(\d{1,2})$/.exec(ageGroup);
  if (!m) throw new Error(`Invalid age group: ${ageGroup}`);
  const k = Number(m[1]);
  if (k < 6 || k > 17) throw new Error(`Unsupported chart age group: ${ageGroup}`);
  return {
    dobStart: utcMidday(seasonStartYear - k, 8, 1),
    dobEnd: utcMidday(seasonStartYear - k + 1, 7, 31),
  };
}

function sortOrderForChartAgeGroup(ageGroup: string): number {
  if (ageGroup === "U19") return 190;
  const k = Number(ageGroup.slice(1));
  return k * 10;
}

export type StandardAgeGroupRuleRow = {
  seasonLabel: string;
  gender: Gender;
  ageGroup: string;
  dobStart: Date;
  dobEnd: Date;
  sortOrder: number;
};

/** Full standard chart for both genders: U6–U17 and U19 (no U18). */
export function buildStandardAgeGroupRuleRows(seasonLabel: string): StandardAgeGroupRuleRow[] {
  const y = parseSeasonStartYear(seasonLabel);
  const rows: StandardAgeGroupRuleRow[] = [];
  for (const gender of [Gender.BOYS, Gender.GIRLS]) {
    for (const ageGroup of YOUTH_AGE_GROUPS) {
      const { dobStart, dobEnd } = dobRangeForStandardAgeGroup(y, ageGroup);
      rows.push({
        seasonLabel,
        gender,
        ageGroup,
        dobStart,
        dobEnd,
        sortOrder: sortOrderForChartAgeGroup(ageGroup),
      });
    }
  }
  return rows;
}
