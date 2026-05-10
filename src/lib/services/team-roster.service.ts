import { StaffRole } from "@prisma/client";
import { TeamPlayerPlacementStatus } from "@prisma/client";
import { getServerEnv } from "@/lib/env";
import type { SessionPayload } from "@/lib/auth/types";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import { isPlayerEligibleForTeamPool } from "@/lib/roster/team-roster-pool-eligibility";
import { listPlayers, type PlayerListRow } from "@/lib/services/players.service";

export type MyTeamPickerRow = {
  id: string;
  teamName: string;
  gender: string;
  ageGroup: string;
};

/** Coach: TeamCoach rows; Director: teams in primary location; Super admin: all (scoped season). */
export async function listMyTeamPickerTeams(
  session: SessionPayload,
  viewerStaffRole: StaffRole | null,
  primaryLocationId: string | null,
  seasonLabel?: string
): Promise<MyTeamPickerRow[]> {
  const season = seasonLabel ?? getServerEnv().DEFAULT_SEASON_LABEL;

  if (session.role === "SUPER_ADMIN") {
    return prisma.team.findMany({
      where: { seasonLabel: season },
      select: { id: true, teamName: true, gender: true, ageGroup: true },
      orderBy: { teamName: "asc" },
    });
  }

  if (!isCoachSession(session)) return [];

  if (viewerStaffRole === "DIRECTOR" && primaryLocationId) {
    return prisma.team.findMany({
      where: { seasonLabel: season, locationId: primaryLocationId },
      select: { id: true, teamName: true, gender: true, ageGroup: true },
      orderBy: { teamName: "asc" },
    });
  }

  return prisma.team.findMany({
    where: {
      seasonLabel: season,
      teamCoaches: { some: { coachId: session.coachId } },
    },
    select: { id: true, teamName: true, gender: true, ageGroup: true },
    orderBy: { teamName: "asc" },
  });
}

/** Unassigned players in the team’s location who pass sex/age eligibility for this squad’s pool. */
export async function listEligiblePoolPlayersForTeam(
  session: SessionPayload,
  teamId: string,
  seasonLabel: string
): Promise<PlayerListRow[]> {
  const team = await prisma.team.findFirst({
    where: { id: teamId },
    select: { gender: true, ageGroup: true, locationId: true },
  });
  if (!team) return [];

  const pool = await listPlayers(session, {
    seasonLabel,
    assignment: "available",
    locationId: team.locationId,
  });

  return pool.filter((p) =>
    isPlayerEligibleForTeamPool(
      {
        gender: p.gender,
        effectiveAgeGroupLabel: p.overrideAgeGroup ?? p.derivedAgeGroup,
      },
      { gender: team.gender, ageGroup: team.ageGroup }
    )
  );
}

export type TeamRosterSummaryCounts = {
  committed: number;
  outstandingOffers: number;
  evaluationInvited: number;
  doNotPursue: number;
  secondaryPending: number;
  guestPending: number;
  /** Contract-style pipeline */
  rosterPipelineCommittedPlusOffered: number;
  /** Evaluation cohort */
  evaluationPoolInvited: number;
  /** Same as rosterPipeline + invited (position-style subtotal) */
  positionSubtotalCommittedOfferedInvited: number;
};

/** Dashboard KPIs for one team (placement counts only). */
export async function getTeamRosterSummary(teamId: string): Promise<TeamRosterSummaryCounts> {
  const grouped = await prisma.teamPlayerPlacement.groupBy({
    by: ["status"],
    where: { teamId },
    _count: { _all: true },
  });
  const m: Partial<Record<TeamPlayerPlacementStatus, number>> = {};
  for (const g of grouped) {
    m[g.status] = g._count._all;
  }

  const committed = m[TeamPlayerPlacementStatus.COMMITTED] ?? 0;
  const outstandingOffers = m[TeamPlayerPlacementStatus.OFFERED] ?? 0;
  const evaluationInvited = m[TeamPlayerPlacementStatus.INVITED] ?? 0;
  const doNotPursue = m[TeamPlayerPlacementStatus.NOT_INTERESTED] ?? 0;
  const secondaryPending = m[TeamPlayerPlacementStatus.SECONDARY_REQUESTED] ?? 0;
  const guestPending = m[TeamPlayerPlacementStatus.GUEST_REQUESTED] ?? 0;

  const rosterPipelineCommittedPlusOffered = committed + outstandingOffers;
  const positionSubtotalCommittedOfferedInvited =
    committed + outstandingOffers + evaluationInvited;

  return {
    committed,
    outstandingOffers,
    evaluationInvited,
    doNotPursue,
    secondaryPending,
    guestPending,
    rosterPipelineCommittedPlusOffered,
    evaluationPoolInvited: evaluationInvited,
    positionSubtotalCommittedOfferedInvited,
  };
}

/** Minimal placement rows for future roster UI / loaders. */
export async function listTeamPlacementsForTeam(teamId: string) {
  return prisma.teamPlayerPlacement.findMany({
    where: { teamId },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primaryPosition: true,
          gender: true,
          derivedAgeGroup: true,
          overrideAgeGroup: true,
          playerStatus: true,
        },
      },
    },
    orderBy: [{ player: { lastName: "asc" } }, { player: { firstName: "asc" } }],
  });
}
