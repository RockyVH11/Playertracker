import { Gender } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { utcDate } from "@/lib/dob-parse";

function seasonStartYear(seasonLabel: string): number {
  const m = /^(\d{4})-\d{4}$/.exec(seasonLabel.trim());
  if (!m) throw new Error("Bad season");
  return Number(m[1]);
}

function fallbackAgeGroup(seasonLabel: string, gender: Gender, dob: Date): string {
  const s = seasonStartYear(seasonLabel);
  const t = utcDate(dob.getUTCFullYear(), dob.getUTCMonth() + 1, dob.getUTCDate());
  for (let k = 6; k <= 17; k++) {
    const start = utcDate(s - k, 8, 1);
    const end = utcDate(s - k + 1, 7, 31);
    if (t >= start && t <= end) return `U${k}`;
  }
  const u19Start = utcDate(s - 19, 8, 1);
  const u19End = utcDate(s - 17, 7, 31);
  if (t >= u19Start && t <= u19End) return "U19";
  return "Unknown";
}

export async function deriveAgeGroupForDob(input: { seasonLabel: string; gender: Gender; dob: Date }): Promise<string> {
  const rules = await prisma.ageGroupRule.findMany({
    where: { seasonLabel: input.seasonLabel, gender: input.gender, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const t = utcDate(input.dob.getUTCFullYear(), input.dob.getUTCMonth() + 1, input.dob.getUTCDate());
  for (const r of rules) {
    if (t >= r.dobStart && t <= r.dobEnd) return r.ageGroup;
  }
  return fallbackAgeGroup(input.seasonLabel, input.gender, input.dob);
}

