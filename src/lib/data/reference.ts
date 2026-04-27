import { prisma } from "@/lib/prisma";

export async function getLocations() {
  return await prisma.location.findMany({ orderBy: { name: "asc" } });
}

export async function getLeagues() {
  return await prisma.league.findMany({ orderBy: { name: "asc" } });
}

export async function getCoaches() {
  return await prisma.coach.findMany({
    where: { isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getTeamsForSelect(seasonLabel: string) {
  return await prisma.team.findMany({
    where: { seasonLabel },
    orderBy: { teamName: "asc" },
    select: { id: true, teamName: true, ageGroup: true, gender: true },
  });
}
