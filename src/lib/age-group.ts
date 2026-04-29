import type { Gender } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildStandardAgeGroupRuleRows,
  parseSeasonStartYear,
} from "@/lib/age-chart-standard";

/**
 * Maps DOB to club age label for a season using `AgeGroupRule` rows.
 * Returns `"Unknown"` when no rule matches (data entry or rules should be fixed).
 */
export async function deriveAgeGroupForDob(input: {
  seasonLabel: string;
  gender: Gender;
  dob: Date;
}): Promise<string> {
  const rules = await prisma.ageGroupRule.findMany({
    where: {
      seasonLabel: input.seasonLabel,
      gender: input.gender,
      isActive: true,
    },
    orderBy: { sortOrder: "asc" },
  });
  const t = startOfUtcDay(input.dob);
  for (const r of rules) {
    if (t >= r.dobStart && t <= r.dobEnd) {
      return r.ageGroup;
    }
  }
  // Fallback to club standard chart so intake never silently drops to Unknown
  // when admin rows are missing or incomplete for a season/gender.
  try {
    parseSeasonStartYear(input.seasonLabel);
    const standard = buildStandardAgeGroupRuleRows(input.seasonLabel).filter(
      (r) => r.gender === input.gender
    );
    for (const r of standard) {
      if (t >= r.dobStart && t <= r.dobEnd) {
        return r.ageGroup;
      }
    }
  } catch {
    /* keep Unknown if season label is malformed */
  }
  return "Unknown";
}

function startOfUtcDay(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  );
}
