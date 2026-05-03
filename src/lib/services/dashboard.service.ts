import { prisma } from "@/lib/prisma";
import {
  type EvaluationLevel,
  type Gender,
  type PlayerPosition,
  type PlayerStatus,
} from "@prisma/client";
import { listPlayers, type PlayerListRow } from "@/lib/services/players.service";
import type { SessionPayload } from "@/lib/auth/types";
import { getServerEnv } from "@/lib/env";
import { ageGroupsBetween } from "@/lib/data/age-group-range";

export type TeamDashboardFilter = {
  seasonLabel?: string;
  leagueId?: string;
  locationId?: string;
  gender?: Gender;
  ageGroupMin?: string;
  ageGroupMax?: string;
  coachId?: string;
  teamId?: string;
  sort?: "team" | "needed" | "assigned" | "committed";
};

export type TeamDashboardRow = {
  id: string;
  teamName: string;
  coachName: string;
  locationName: string;
  gender: Gender;
  ageGroup: string;
  leagueName: string | null;
  openSession: boolean;
  prospectsCount: number;
  returningPlayerCount: number;
  neededPlayerCount: number;
  neededGoalkeepers: number;
  neededDefenders: number;
  neededMidfielders: number;
  neededForwards: number;
  neededUtility: number;
  committedPlayerCount: number;
  assignedPlayerCount: number;
  coachEstimatedPlayerCount: number;
  recruitingNeeds: string | null;
};

export async function listTeamDashboardRows(
  input: TeamDashboardFilter = {}
): Promise<TeamDashboardRow[]> {
  const seasonLabel = input.seasonLabel ?? getServerEnv().DEFAULT_SEASON_LABEL;
  const cohortLabels = ageGroupsBetween(input.ageGroupMin, input.ageGroupMax);

  const rows = await prisma.team.findMany({
    where: {
      seasonLabel,
      ...(input.leagueId ? { leagueId: input.leagueId } : {}),
      ...(input.locationId ? { locationId: input.locationId } : {}),
      ...(input.gender ? { gender: input.gender } : {}),
      ...(cohortLabels != null && cohortLabels.length === 0
        ? { id: { in: [] } }
        : cohortLabels != null && cohortLabels.length > 0
          ? { ageGroup: { in: [...cohortLabels] } }
          : {}),
      ...(input.coachId ? { coachId: input.coachId } : {}),
      ...(input.teamId ? { id: input.teamId } : {}),
    },
    include: {
      coach: true,
      location: true,
      league: true,
    },
    orderBy: [{ teamName: "asc" }],
  });

  const assignedCounts = await prisma.player.groupBy({
    by: ["assignedTeamId"],
    where: {
      seasonLabel,
      assignedTeamId: { in: rows.map((r) => r.id) },
    },
    _count: { _all: true },
  });
  const assignedMap = new Map(
    assignedCounts
      .filter((r) => r.assignedTeamId != null)
      .map((r) => [r.assignedTeamId as string, r._count._all] as const)
  );

  const dashboardRows = await Promise.all(
    rows.map(async (t) => {
      const prospectsCount = await prisma.player.count({
        where: {
          seasonLabel,
          assignedTeamId: null,
          gender: t.gender,
          locationId: t.locationId,
          playerStatus: { in: ["AVAILABLE", "INVITED"] as PlayerStatus[] },
          OR: [
            { overrideAgeGroup: t.ageGroup },
            { AND: [{ overrideAgeGroup: null }, { derivedAgeGroup: t.ageGroup }] },
          ],
        },
      });
      return {
        id: t.id,
        teamName: t.teamName,
        coachName: `${t.coach.lastName}, ${t.coach.firstName}`,
        locationName: t.location.name,
        gender: t.gender,
        ageGroup: t.ageGroup,
        leagueName: t.league?.name ?? null,
        openSession: t.openSession,
        prospectsCount,
        returningPlayerCount: t.returningPlayerCount,
        neededPlayerCount: t.neededPlayerCount,
        neededGoalkeepers: t.neededGoalkeepers,
        neededDefenders: t.neededDefenders,
        neededMidfielders: t.neededMidfielders,
        neededForwards: t.neededForwards,
        neededUtility: t.neededUtility,
        committedPlayerCount: t.committedPlayerCount,
        assignedPlayerCount: assignedMap.get(t.id) ?? 0,
        coachEstimatedPlayerCount: t.coachEstimatedPlayerCount,
        recruitingNeeds: t.recruitingNeeds,
      };
    })
  );

  const sort = input.sort ?? "team";
  if (sort === "needed") {
    dashboardRows.sort((a, b) => b.neededPlayerCount - a.neededPlayerCount);
  } else if (sort === "assigned") {
    dashboardRows.sort((a, b) => b.assignedPlayerCount - a.assignedPlayerCount);
  } else if (sort === "committed") {
    dashboardRows.sort((a, b) => b.committedPlayerCount - a.committedPlayerCount);
  } else {
    dashboardRows.sort((a, b) => a.teamName.localeCompare(b.teamName));
  }
  return dashboardRows;
}

export type DashboardPlayersFilter = {
  seasonLabel?: string;
  gender?: Gender;
  ageGroupMin?: string;
  ageGroupMax?: string;
  locationId?: string;
  /** When set, the player grid only shows athletes rostered on this team for the selected season. */
  teamId?: string;
  evaluationLevel?: EvaluationLevel;
  leagueInterestId?: string;
  willingToPlayUp?: "any" | "yes" | "no";
  playerStatus?: PlayerStatus;
  primaryPosition?: PlayerPosition;
  dobMin?: Date;
  dobMax?: Date;
};

/** Assigned and unassigned players matching dashboard cohort filters (RBAC/contact rules unchanged). */
export async function listDashboardMatchingPlayers(
  session: SessionPayload,
  input: DashboardPlayersFilter = {}
): Promise<PlayerListRow[]> {
  const cohortLabels = ageGroupsBetween(input.ageGroupMin, input.ageGroupMax);
  const base = await listPlayers(session, {
    seasonLabel: input.seasonLabel,
    gender: input.gender,
    effectiveAgeGroupLabelsIn: cohortLabels,
    locationId: input.locationId,
    ...(input.teamId ? { assignedTeamId: input.teamId } : {}),
    evaluationLevel: input.evaluationLevel,
    leagueInterestId: input.leagueInterestId,
    assignment: "any",
    playerStatus: input.playerStatus,
    primaryPosition: input.primaryPosition,
    dobMin: input.dobMin,
    dobMax: input.dobMax,
  });
  if (input.willingToPlayUp === "yes") {
    return base.filter((p) => p.willingToPlayUp);
  }
  if (input.willingToPlayUp === "no") {
    return base.filter((p) => !p.willingToPlayUp);
  }
  return base;
}
