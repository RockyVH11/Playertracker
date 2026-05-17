import type { Gender } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export type IntakeIdentityMatchRow = {
  id: string;
  firstName: string;
  lastName: string;
  dob: Date;
  gender: Gender;
};

/**
 * Open-practice identity: same season, gender, DOB (calendar day), and first/last name (case-insensitive trim).
 */
export async function findPlayerByIntakeIdentity(input: {
  seasonLabel: string;
  gender: Gender;
  firstName: string;
  lastName: string;
  dob: Date;
}): Promise<IntakeIdentityMatchRow | null> {
  const f = norm(input.firstName);
  const l = norm(input.lastName);
  if (!f || !l) return null;

  const row = await prisma.player.findFirst({
    where: {
      seasonLabel: input.seasonLabel,
      gender: input.gender,
      dob: input.dob,
      firstName: { equals: f, mode: "insensitive" },
      lastName: { equals: l, mode: "insensitive" },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dob: true,
      gender: true,
    },
  });
  return row;
}
