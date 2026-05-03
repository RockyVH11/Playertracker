import { prisma } from "@/lib/prisma";

const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  staffRole: true,
  staffRoleLabel: true,
  primaryAreaLabel: true,
  primaryLocationId: true,
  isActive: true,
} as const;

export type CoachStaffRecord = NonNullable<Awaited<ReturnType<typeof findActiveCoachStaffById>>>;

export async function findActiveCoachStaffById(coachId: string) {
  return prisma.coach.findFirst({
    where: { id: coachId, isActive: true },
    select: staffSelect,
  });
}

export async function findCoachStaffByIdIncludingInactive(coachId: string) {
  return prisma.coach.findFirst({
    where: { id: coachId },
    select: staffSelect,
  });
}
