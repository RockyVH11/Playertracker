import { StaffRole, TeamPlayerPlacementStatus } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { isCoachSession } from "@/lib/auth/types";
import { coachIsOnTeam } from "@/lib/roster/my-team-rbac";
import { findCommittedPrimaryPlacement, findHeadCoachIdForTeam } from "@/lib/roster/placement-queries";
import { viewerStaffContext } from "@/lib/roster/team-roster-session";

export type TeamRosterPagePermissions = {
  /** Invite → offer → commit transitions on primary pipeline */
  canTransitionPipeline: boolean;
  /** Director or super admin — secondary approve/deny */
  canApproveSecondary: boolean;
  /** Placement ids where this viewer may approve/deny guest (committed team head coach or super admin) */
  guestActionPlacementIds: Set<string>;
  /** Add unassigned players from pool → roster (INVITED primary placement + assignment) */
  canAddPlayersFromPool: boolean;
};

export async function resolveTeamRosterPagePermissions(
  session: SessionPayload,
  team: { id: string; coachId: string; locationId: string },
  placementRows: { id: string; status: TeamPlayerPlacementStatus; playerId: string }[]
): Promise<TeamRosterPagePermissions> {
  const { staffRole, primaryLocationId } = await viewerStaffContext(session);

  let canTransitionPipeline = false;
  if (session.role === "SUPER_ADMIN") {
    canTransitionPipeline = true;
  } else if (isCoachSession(session)) {
    if (session.coachId === team.coachId || (await coachIsOnTeam(session.coachId, team.id))) {
      canTransitionPipeline = true;
    }
  }

  let canAddPlayersFromPool = false;
  if (session.role === "SUPER_ADMIN") {
    canAddPlayersFromPool = true;
  } else if (isCoachSession(session)) {
    const directorOk =
      staffRole === StaffRole.DIRECTOR &&
      primaryLocationId != null &&
      primaryLocationId === team.locationId;
    const coachOk =
      session.coachId === team.coachId || (await coachIsOnTeam(session.coachId, team.id));
    canAddPlayersFromPool = directorOk || coachOk;
  }

  const canApproveSecondary =
    session.role === "SUPER_ADMIN" ||
    (isCoachSession(session) && staffRole === StaffRole.DIRECTOR);

  const guestActionPlacementIds = new Set<string>();
  if (session.role === "SUPER_ADMIN") {
    for (const row of placementRows) {
      if (row.status === TeamPlayerPlacementStatus.GUEST_REQUESTED) {
        guestActionPlacementIds.add(row.id);
      }
    }
  } else if (isCoachSession(session)) {
    for (const row of placementRows) {
      if (row.status !== TeamPlayerPlacementStatus.GUEST_REQUESTED) continue;
      const committed = await findCommittedPrimaryPlacement(row.playerId);
      if (!committed) continue;
      const headCoachId = await findHeadCoachIdForTeam(committed.teamId);
      if (headCoachId === session.coachId) guestActionPlacementIds.add(row.id);
    }
  }

  return {
    canTransitionPipeline,
    canApproveSecondary,
    guestActionPlacementIds,
    canAddPlayersFromPool,
  };
}
