import { prisma } from "@/lib/prisma";

export async function getLocations() {
  return await prisma.location.findMany({ orderBy: { name: "asc" } });
}

export async function getLeagues() {
  return await prisma.league.findMany({
    orderBy: [{ hierarchy: "asc" }, { name: "asc" }],
  });
}

export async function getCoaches() {
  return await prisma.coach.findMany({
    where: { isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      staffRole: true,
      staffRoleLabel: true,
      primaryAreaLabel: true,
      primaryLocation: { select: { name: true } },
    },
  });
}

export async function getTeamsForSelect(
  seasonLabel: string,
  opts?: { prioritizeCoachId?: string | null }
) {
  const rows = await prisma.team.findMany({
    where: { seasonLabel },
    orderBy: { teamName: "asc" },
    select: { id: true, teamName: true, ageGroup: true, gender: true, coachId: true },
  });
  if (opts?.prioritizeCoachId) {
    const coachId = opts.prioritizeCoachId;
    rows.sort((a, b) => {
      const aOwn = a.coachId === coachId ? 0 : 1;
      const bOwn = b.coachId === coachId ? 0 : 1;
      if (aOwn !== bOwn) return aOwn - bOwn;
      return a.teamName.localeCompare(b.teamName);
    });
  }
  return rows.map(({ coachId: _coachId, ...t }) => t);
}
