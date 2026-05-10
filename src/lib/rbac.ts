import { StaffRole, type Prospect, type Team } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

export type PlayerForEdit = {
  createdByCoachId: string | null;
  /** Legacy primary coach on Team — kept during TeamCoach rollout */
  assignedTeam: { coachId: string } | null;
  /** When set, coaches in `TeamCoach` for this team id may view/edit like legacy head coach */
  assignedTeamId?: string | null;
};

function coachHasTeamCoachMembership(
  session: SessionPayload,
  row: PlayerForEdit,
  coachTeamIds?: Set<string>
): boolean {
  return !!(
    row.assignedTeamId &&
    coachTeamIds?.size &&
    coachTeamIds.has(row.assignedTeamId)
  );
}

export function canViewPlayerContact(
  session: SessionPayload,
  row: PlayerForEdit,
  coachTeamIds?: Set<string>
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (!isCoachSession(session)) return false;
  if (row.createdByCoachId === session.coachId) return true;
  if (row.assignedTeam?.coachId === session.coachId) return true;
  if (coachHasTeamCoachMembership(session, row, coachTeamIds)) return true;
  return false;
}

export function canEditPlayer(
  session: SessionPayload,
  row: PlayerForEdit,
  coachTeamIds?: Set<string>
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (!isCoachSession(session)) return false;
  if (row.createdByCoachId === session.coachId) return true;
  if (row.assignedTeam?.coachId === session.coachId) return true;
  if (coachHasTeamCoachMembership(session, row, coachTeamIds)) return true;
  return false;
}

/** Same gate as editing: creator coach, assigned team's coach, or super admin — keeps seed/demo removable without extra roles. */
export function canDeletePlayer(
  session: SessionPayload,
  row: PlayerForEdit,
  coachTeamIds?: Set<string>
): boolean {
  return canEditPlayer(session, row, coachTeamIds);
}

export function canDeleteTeamOwnedByCoach(session: SessionPayload, teamCoachId: string): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (!isCoachSession(session)) return false;
  return teamCoachId === session.coachId;
}

export function canCreatePlayer(session: SessionPayload): boolean {
  return (
    session.role === "SUPER_ADMIN" || isCoachSession(session)
  );
}

export async function canEditTeam(
  session: SessionPayload,
  team: Pick<Team, "coachId">
): Promise<boolean> {
  if (session.role === "SUPER_ADMIN") return true;
  if (!isCoachSession(session)) return false;
  return team.coachId === session.coachId;
}

export function canSetCommittedCount(session: SessionPayload): boolean {
  return session.role === "SUPER_ADMIN";
}

export function canSetCoachEstimate(
  session: SessionPayload,
  team: Pick<Team, "coachId">
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (!isCoachSession(session)) return false;
  return team.coachId === session.coachId;
}

export async function assertCoachActive(coachId: string) {
  const coach = await prisma.coach.findFirst({
    where: { id: coachId, isActive: true },
  });
  if (!coach) {
    throw new Error("Invalid coach");
  }
}

/** Team ids where this coach is listed on `TeamCoach` (assistant / head / manager). */
export async function getCoachTeamIdSet(
  session: SessionPayload
): Promise<Set<string> | undefined> {
  if (session.role === "SUPER_ADMIN" || !isCoachSession(session)) return undefined;
  const rows = await prisma.teamCoach.findMany({
    where: { coachId: session.coachId },
    select: { teamId: true },
  });
  return new Set(rows.map((r) => r.teamId));
}

export function canAccessProspectDashboard(
  session: SessionPayload,
  viewerStaffRole: StaffRole | null
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  return viewerStaffRole === StaffRole.DIRECTOR;
}

export function canDeleteProspect(session: SessionPayload, viewerStaffRole: StaffRole | null) {
  if (session.role === "SUPER_ADMIN") return true;
  return viewerStaffRole === StaffRole.DIRECTOR;
}

export function canAssignOrReassignProspect(
  session: SessionPayload,
  viewerStaffRole: StaffRole | null
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  return viewerStaffRole === StaffRole.DIRECTOR;
}

/** Phone/email and similar contact channels on a Prospect row. */
export function canViewProspectSensitiveContact(
  session: SessionPayload,
  viewerStaffRole: StaffRole | null,
  viewerCoachId: string | null,
  row: Pick<Prospect, "assignedToCoachId" | "submittedByCoachId">
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (viewerStaffRole === StaffRole.DIRECTOR) return true;
  if (!isCoachSession(session) || !viewerCoachId) return false;
  if (row.assignedToCoachId === viewerCoachId) return true;
  if (row.submittedByCoachId === viewerCoachId) return true;
  return false;
}

/** Assignee Coach/Manager: status + notes only; Directors/Super Admin may edit broadly. */
export function canCoachUpdateProspectAssignmentsOnly(
  session: SessionPayload,
  viewerStaffRole: StaffRole | null,
  viewerCoachId: string | null,
  prospect: Pick<Prospect, "assignedToCoachId">
): boolean {
  if (!isCoachSession(session) || viewerCoachId == null) return false;
  return (
    (viewerStaffRole === StaffRole.COACH ||
      viewerStaffRole === StaffRole.MANAGER) &&
    prospect.assignedToCoachId === viewerCoachId
  );
}
