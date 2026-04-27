import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth/types";
import {
  canSetCommittedCount,
  canSetCoachEstimate,
} from "@/lib/rbac";
import { isCoachSession } from "@/lib/auth/types";

export type TeamListRow = {
  id: string;
  seasonLabel: string;
  teamName: string;
  location: { id: string; name: string };
  gender: "BOYS" | "GIRLS";
  ageGroup: string;
  openSession: boolean;
  committedPlayerCount: number;
  coachEstimatedPlayerCount: number;
  recruitingNeeds: string | null;
  notes: string | null;
  league: { id: string; name: string } | null;
  coach: { id: string; firstName: string; lastName: string };
  assignedPlayerCount: number;
};

export async function getAssignedPlayerCount(teamId: string): Promise<number> {
  return await prisma.player.count({ where: { assignedTeamId: teamId } });
}

export async function listTeams(
  input: { seasonLabel?: string } = {}
): Promise<TeamListRow[]> {
  const { getServerEnv } = await import("@/lib/env");
  const season = input.seasonLabel ?? getServerEnv().DEFAULT_SEASON_LABEL;
  const teams = await prisma.team.findMany({
    where: { seasonLabel: season },
    orderBy: { teamName: "asc" },
    include: {
      location: { select: { id: true, name: true } },
      league: { select: { id: true, name: true } },
      coach: { select: { firstName: true, lastName: true, id: true } },
    },
  });
  return await Promise.all(
    teams.map(async (t) => {
      const assignedPlayerCount = await getAssignedPlayerCount(t.id);
      return {
        id: t.id,
        seasonLabel: t.seasonLabel,
        teamName: t.teamName,
        location: t.location,
        gender: t.gender,
        ageGroup: t.ageGroup,
        openSession: t.openSession,
        committedPlayerCount: t.committedPlayerCount,
        coachEstimatedPlayerCount: t.coachEstimatedPlayerCount,
        recruitingNeeds: t.recruitingNeeds,
        league: t.league,
        coach: {
          id: t.coach.id,
          firstName: t.coach.firstName,
          lastName: t.coach.lastName,
        },
        notes: t.notes,
        assignedPlayerCount,
      };
    })
  );
}

export async function getTeamById(
  id: string
): Promise<TeamListRow | null> {
  const t = await prisma.team.findFirst({
    where: { id },
    include: {
      location: { select: { id: true, name: true } },
      league: { select: { id: true, name: true } },
      coach: { select: { firstName: true, lastName: true, id: true } },
    },
  });
  if (!t) return null;
  const assignedPlayerCount = await getAssignedPlayerCount(t.id);
  return {
    id: t.id,
    seasonLabel: t.seasonLabel,
    teamName: t.teamName,
    location: t.location,
    gender: t.gender,
    ageGroup: t.ageGroup,
    openSession: t.openSession,
    committedPlayerCount: t.committedPlayerCount,
    coachEstimatedPlayerCount: t.coachEstimatedPlayerCount,
    recruitingNeeds: t.recruitingNeeds,
    notes: t.notes,
    league: t.league,
    coach: {
      id: t.coach.id,
      firstName: t.coach.firstName,
      lastName: t.coach.lastName,
    },
    assignedPlayerCount,
  };
}

function assertSuperAdmin(s: SessionPayload) {
  if (s.role !== "SUPER_ADMIN") {
    throw new Error("Only super admin can do this in MVP");
  }
}

export async function createTeam(input: {
  session: SessionPayload;
  data: {
    seasonLabel: string;
    teamName: string;
    locationId: string;
    gender: import("@prisma/client").Gender;
    ageGroup: string;
    coachId: string;
    leagueId: string | null;
    openSession: boolean;
    committedPlayerCount: number;
    coachEstimatedPlayerCount: number;
    recruitingNeeds: string | null;
    notes: string | null;
  };
}): Promise<{ id: string }> {
  assertSuperAdmin(input.session);
  const team = await prisma.team.create({
    data: {
      seasonLabel: input.data.seasonLabel,
      teamName: input.data.teamName,
      locationId: input.data.locationId,
      gender: input.data.gender,
      ageGroup: input.data.ageGroup,
      coachId: input.data.coachId,
      leagueId: input.data.leagueId,
      openSession: input.data.openSession,
      committedPlayerCount: input.data.committedPlayerCount,
      coachEstimatedPlayerCount: input.data.coachEstimatedPlayerCount,
      recruitingNeeds: input.data.recruitingNeeds,
      notes: input.data.notes,
    },
  });
  return { id: team.id };
}

export async function updateTeam(input: {
  session: SessionPayload;
  id: string;
  data: Partial<{
    seasonLabel: string;
    teamName: string;
    locationId: string;
    gender: import("@prisma/client").Gender;
    ageGroup: string;
    coachId: string;
    leagueId: string | null;
    openSession: boolean;
    committedPlayerCount: number;
    coachEstimatedPlayerCount: number;
    recruitingNeeds: string | null;
    notes: string | null;
  }>;
}): Promise<void> {
  const team = await prisma.team.findFirst({ where: { id: input.id } });
  if (!team) throw new Error("Team not found");
  if (input.session.role === "SUPER_ADMIN") {
    await prisma.team.update({ where: { id: input.id }, data: input.data });
    return;
  }
  if (!isCoachSession(input.session)) {
    throw new Error("Not allowed");
  }
  if (team.coachId !== input.session.coachId) {
    throw new Error("Not allowed to edit this team");
  }
  if (
    input.data.committedPlayerCount != null &&
    !canSetCommittedCount(input.session)
  ) {
    throw new Error("Only super admin can set committed count");
  }
  if (
    input.data.coachEstimatedPlayerCount != null &&
    !canSetCoachEstimate(input.session, team)
  ) {
    throw new Error("Not allowed to set coach estimate");
  }
  await prisma.team.update({
    where: { id: input.id },
    data: {
      coachEstimatedPlayerCount: input.data.coachEstimatedPlayerCount,
      recruitingNeeds: input.data.recruitingNeeds,
    },
  });
}

export async function deleteTeam(input: { session: SessionPayload; id: string }) {
  assertSuperAdmin(input.session);
  await prisma.team.delete({ where: { id: input.id } });
}
