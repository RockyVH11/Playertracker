import type { Gender } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
  return "Unknown";
}

function startOfUtcDay(d: Date) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  );
}
