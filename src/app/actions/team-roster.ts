"use server";

import {
  PlayerStatus,
  StaffRole,
  TeamPlayerPlacementStatus,
  TeamPlayerPlacementType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import {
  assertCoachCanAccessTeamForMyTeam,
  assertDirector,
  coachIsOnTeam,
} from "@/lib/roster/my-team-rbac";
import { viewerStaffContext } from "@/lib/roster/team-roster-session";
import {
  findCommittedPrimaryPlacement,
  findHeadCoachIdForTeam,
  findOfferedPrimaryElsewhere,
} from "@/lib/roster/placement-queries";
import { syncPrimaryPlacementFromAssignedTeamChange } from "@/lib/roster/sync-primary-placement-from-assignment";
import { isPlayerEligibleForTeamPool } from "@/lib/roster/team-roster-pool-eligibility";
import { syncPlayerLifecycleFromPlacements } from "@/lib/roster/sync-player-lifecycle";
import {
  approvePlacementIdSchema,
  assignPlayerToTeamRosterSchema,
  invitePlayerSchema,
  requestGuestSchema,
  requestSecondarySchema,
  returnPrimaryInviteToPoolSchema,
  transitionPlacementSchema,
} from "@/lib/validation/team-roster";

export type TeamRosterActionResult = { ok: true } | { ok: false; error: string };

function revalidateAfterRosterMutation(teamIds: Array<string | undefined | null>) {
  revalidatePath("/teams");
  revalidatePath("/players");
  const seen = new Set<string>();
  for (const id of teamIds) {
    if (id && !seen.has(id)) {
      seen.add(id);
      revalidatePath(`/teams/${id}`);
    }
  }
}

export async function invitePlayerToTeamAction(formData: FormData): Promise<TeamRosterActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && !isCoachSession(session))) {
    return { ok: false, error: "Sign in as staff." };
  }

  const parsed = invitePlayerSchema.safeParse({
    teamId: String(formData.get("teamId") ?? ""),
    playerId: String(formData.get("playerId") ?? ""),
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid invite." };

  const { staffRole, primaryLocationId } = await viewerStaffContext(session);
  try {
    await assertCoachCanAccessTeamForMyTeam(session, staffRole, primaryLocationId, parsed.data.teamId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized." };
  }

  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) return { ok: false, error: "Sign in as staff." };
    if (!(await coachIsOnTeam(session.coachId, parsed.data.teamId))) {
      return { ok: false, error: "You must be listed on this team to invite." };
    }
  }

  const player = await prisma.player.findFirst({
    where: { id: parsed.data.playerId },
    select: { playerStatus: true },
  });
  if (!player) return { ok: false, error: "Player not found." };
  if (player.playerStatus === PlayerStatus.ARCHIVED) {
    return { ok: false, error: "Cannot invite an archived player." };
  }

  const existing = await prisma.teamPlayerPlacement.findUnique({
    where: {
      playerId_teamId: {
        playerId: parsed.data.playerId,
        teamId: parsed.data.teamId,
      },
    },
  });
  if (existing) return { ok: false, error: "This player already has a placement row for this team." };

  await prisma.teamPlayerPlacement.create({
    data: {
      playerId: parsed.data.playerId,
      teamId: parsed.data.teamId,
      status: TeamPlayerPlacementStatus.INVITED,
      placementType: TeamPlayerPlacementType.PRIMARY,
      requestedByCoachId: isCoachSession(session) ? session.coachId : null,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  await syncPlayerLifecycleFromPlacements(parsed.data.playerId);
  revalidateAfterRosterMutation([parsed.data.teamId]);
  return { ok: true };
}

export async function transitionTeamPlacementAction(formData: FormData): Promise<TeamRosterActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && !isCoachSession(session))) {
    return { ok: false, error: "Sign in as staff." };
  }

  const parsed = transitionPlacementSchema.safeParse({
    placementId: String(formData.get("placementId") ?? ""),
    nextStatus: String(formData.get("nextStatus") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Invalid transition." };

  const placement = await prisma.teamPlayerPlacement.findFirst({
    where: { id: parsed.data.placementId },
    include: { team: { select: { id: true } } },
  });
  if (!placement) return { ok: false, error: "Placement not found." };

  const { staffRole, primaryLocationId } = await viewerStaffContext(session);
  try {
    await assertCoachCanAccessTeamForMyTeam(session, staffRole, primaryLocationId, placement.teamId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized." };
  }
  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) return { ok: false, error: "Sign in as staff." };
    if (!(await coachIsOnTeam(session.coachId, placement.teamId))) {
      return { ok: false, error: "Not authorized for this team." };
    }
  }

  if (placement.status === TeamPlayerPlacementStatus.COMMITTED) {
    return { ok: false, error: "Committed placements cannot be changed by coaches." };
  }

  const next = parsed.data.nextStatus;
  if (placement.status === TeamPlayerPlacementStatus.INVITED) {
    if (
      next !== TeamPlayerPlacementStatus.OFFERED &&
      next !== TeamPlayerPlacementStatus.NOT_INTERESTED
    ) {
      return { ok: false, error: "Invalid transition from invited." };
    }
  } else if (placement.status === TeamPlayerPlacementStatus.OFFERED) {
    if (
      next !== TeamPlayerPlacementStatus.COMMITTED &&
      next !== TeamPlayerPlacementStatus.NOT_INTERESTED
    ) {
      return { ok: false, error: "Invalid transition from offered." };
    }
  } else {
    return { ok: false, error: "This placement cannot be transitioned by coaches." };
  }

  await prisma.teamPlayerPlacement.update({
    where: { id: placement.id },
    data: { status: next },
  });

  await syncPlayerLifecycleFromPlacements(placement.playerId);
  revalidateAfterRosterMutation([placement.teamId]);
  return { ok: true };
}

/**
 * Return an INVITED placement toward pool semantics without using NOT_INTERESTED (Decline owns that status):
 * - PRIMARY: clear assignment; primary placement row is deleted via assignment sync unless already Declined.
 * - SECONDARY/GUEST: delete this placement row; does not change `assignedTeamId`.
 */
export async function returnPrimaryInviteToPoolAction(
  formData: FormData
): Promise<TeamRosterActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && !isCoachSession(session))) {
    return { ok: false, error: "Sign in as staff." };
  }

  const parsed = returnPrimaryInviteToPoolSchema.safeParse({
    placementId: String(formData.get("placementId") ?? ""),
    teamId: String(formData.get("teamId") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const placement = await prisma.teamPlayerPlacement.findFirst({
    where: { id: parsed.data.placementId, teamId: parsed.data.teamId },
    select: {
      id: true,
      playerId: true,
      teamId: true,
      status: true,
      placementType: true,
    },
  });
  if (!placement) return { ok: false, error: "Placement not found." };

  if (placement.status !== TeamPlayerPlacementStatus.INVITED) {
    return {
      ok: false,
      error: "Only players still at Invited can return to the pool (offer/commit first if applicable).",
    };
  }

  const allowedSecondaryGuest =
    placement.placementType === TeamPlayerPlacementType.SECONDARY ||
    placement.placementType === TeamPlayerPlacementType.GUEST;
  if (placement.placementType !== TeamPlayerPlacementType.PRIMARY && !allowedSecondaryGuest) {
    return { ok: false, error: "This placement type cannot use return to pool from here." };
  }

  const { staffRole, primaryLocationId } = await viewerStaffContext(session);
  try {
    await assertCoachCanAccessTeamForMyTeam(session, staffRole, primaryLocationId, placement.teamId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized." };
  }
  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) return { ok: false, error: "Sign in as staff." };
    const teamRow = await prisma.team.findFirst({
      where: { id: placement.teamId },
      select: { locationId: true },
    });
    const directorOk =
      staffRole === StaffRole.DIRECTOR &&
      primaryLocationId != null &&
      teamRow != null &&
      primaryLocationId === teamRow.locationId;
    if (!directorOk && !(await coachIsOnTeam(session.coachId, placement.teamId))) {
      return { ok: false, error: "Not authorized for this team." };
    }
  }

  if (allowedSecondaryGuest) {
    await prisma.teamPlayerPlacement.delete({ where: { id: placement.id } });
    await syncPlayerLifecycleFromPlacements(placement.playerId);
    revalidateAfterRosterMutation([placement.teamId]);
    return { ok: true };
  }

  const player = await prisma.player.findFirst({
    where: { id: placement.playerId },
    select: { id: true, assignedTeamId: true },
  });
  if (!player) return { ok: false, error: "Player not found." };
  if (player.assignedTeamId !== placement.teamId) {
    return { ok: false, error: "Player is not assigned to this team." };
  }

  await prisma.player.update({
    where: { id: player.id },
    data: { assignedTeamId: null },
  });
  await syncPrimaryPlacementFromAssignedTeamChange({
    playerId: player.id,
    fromAssignedTeamId: placement.teamId,
    toAssignedTeamId: null,
  });

  revalidateAfterRosterMutation([placement.teamId]);
  return { ok: true };
}

export async function returnPrimaryInviteToPoolFormAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const result = await returnPrimaryInviteToPoolAction(formData);
  if (!result.ok) {
    redirect(`/teams/${teamId}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/teams/${teamId}?returnedToPool=1`);
}

/** Secondary / guest pipeline: INVITED → director or head-coach approval queue. */
export async function requestPlacementApprovalFromInvitedAction(
  formData: FormData
): Promise<TeamRosterActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && !isCoachSession(session))) {
    return { ok: false, error: "Sign in as staff." };
  }

  const parsed = returnPrimaryInviteToPoolSchema.safeParse({
    placementId: String(formData.get("placementId") ?? ""),
    teamId: String(formData.get("teamId") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const placement = await prisma.teamPlayerPlacement.findFirst({
    where: { id: parsed.data.placementId, teamId: parsed.data.teamId },
    select: {
      id: true,
      playerId: true,
      teamId: true,
      status: true,
      placementType: true,
    },
  });
  if (!placement) return { ok: false, error: "Placement not found." };

  if (placement.status !== TeamPlayerPlacementStatus.INVITED) {
    return { ok: false, error: "Only invited placements can request approval from here." };
  }

  const isSecondary = placement.placementType === TeamPlayerPlacementType.SECONDARY;
  const isGuest = placement.placementType === TeamPlayerPlacementType.GUEST;
  if (!isSecondary && !isGuest) {
    return { ok: false, error: "Request approval applies to secondary or guest placements only." };
  }

  const { staffRole, primaryLocationId } = await viewerStaffContext(session);
  try {
    await assertCoachCanAccessTeamForMyTeam(session, staffRole, primaryLocationId, placement.teamId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized." };
  }
  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) return { ok: false, error: "Sign in as staff." };
    const teamRow = await prisma.team.findFirst({
      where: { id: placement.teamId },
      select: { locationId: true },
    });
    const directorOk =
      staffRole === StaffRole.DIRECTOR &&
      primaryLocationId != null &&
      teamRow != null &&
      primaryLocationId === teamRow.locationId;
    if (!directorOk && !(await coachIsOnTeam(session.coachId, placement.teamId))) {
      return { ok: false, error: "Not authorized for this team." };
    }
  }

  if (isGuest) {
    const committed = await findCommittedPrimaryPlacement(placement.playerId);
    if (!committed || committed.teamId === placement.teamId) {
      return {
        ok: false,
        error:
          "Guest approval requires the player to be committed to a different team first. Use secondary while they are unassigned.",
      };
    }
  }

  await prisma.teamPlayerPlacement.update({
    where: { id: placement.id },
    data: {
      status: isSecondary
        ? TeamPlayerPlacementStatus.SECONDARY_REQUESTED
        : TeamPlayerPlacementStatus.GUEST_REQUESTED,
      requestedByCoachId: isCoachSession(session) ? session.coachId : null,
    },
  });

  await syncPlayerLifecycleFromPlacements(placement.playerId);
  revalidateAfterRosterMutation([placement.teamId]);
  return { ok: true };
}

export async function requestPlacementApprovalFromInvitedFormAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const result = await requestPlacementApprovalFromInvitedAction(formData);
  if (!result.ok) {
    redirect(`/teams/${teamId}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/teams/${teamId}?approvalRequested=1`);
}

export async function requestSecondaryPlacementAction(formData: FormData): Promise<TeamRosterActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && !isCoachSession(session))) {
    return { ok: false, error: "Sign in as staff." };
  }

  const parsed = requestSecondarySchema.safeParse({
    playerId: String(formData.get("playerId") ?? ""),
    requestingTeamId: String(formData.get("requestingTeamId") ?? ""),
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { staffRole, primaryLocationId } = await viewerStaffContext(session);
  try {
    await assertCoachCanAccessTeamForMyTeam(session, staffRole, primaryLocationId, parsed.data.requestingTeamId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized." };
  }
  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) return { ok: false, error: "Sign in as staff." };
    if (!(await coachIsOnTeam(session.coachId, parsed.data.requestingTeamId))) {
      return { ok: false, error: "You must be on the requesting team." };
    }
  }

  const offeredElsewhere = await findOfferedPrimaryElsewhere(
    parsed.data.playerId,
    parsed.data.requestingTeamId
  );
  if (!offeredElsewhere) {
    return { ok: false, error: "Player needs an outstanding offer on another team first." };
  }

  await prisma.teamPlayerPlacement.upsert({
    where: {
      playerId_teamId: {
        playerId: parsed.data.playerId,
        teamId: parsed.data.requestingTeamId,
      },
    },
    create: {
      playerId: parsed.data.playerId,
      teamId: parsed.data.requestingTeamId,
      status: TeamPlayerPlacementStatus.SECONDARY_REQUESTED,
      placementType: TeamPlayerPlacementType.SECONDARY,
      requestedByCoachId: isCoachSession(session) ? session.coachId : null,
      notes: parsed.data.notes?.trim() || null,
    },
    update: {
      status: TeamPlayerPlacementStatus.SECONDARY_REQUESTED,
      placementType: TeamPlayerPlacementType.SECONDARY,
      requestedByCoachId: isCoachSession(session) ? session.coachId : null,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  await syncPlayerLifecycleFromPlacements(parsed.data.playerId);
  revalidateAfterRosterMutation([parsed.data.requestingTeamId]);
  return { ok: true };
}

export async function requestGuestPlacementAction(formData: FormData): Promise<TeamRosterActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && !isCoachSession(session))) {
    return { ok: false, error: "Sign in as staff." };
  }

  const parsed = requestGuestSchema.safeParse({
    playerId: String(formData.get("playerId") ?? ""),
    requestingTeamId: String(formData.get("requestingTeamId") ?? ""),
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { staffRole, primaryLocationId } = await viewerStaffContext(session);
  try {
    await assertCoachCanAccessTeamForMyTeam(session, staffRole, primaryLocationId, parsed.data.requestingTeamId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized." };
  }
  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) return { ok: false, error: "Sign in as staff." };
    if (!(await coachIsOnTeam(session.coachId, parsed.data.requestingTeamId))) {
      return { ok: false, error: "You must be on the requesting team." };
    }
  }

  const committedElsewhere = await findCommittedPrimaryPlacement(parsed.data.playerId);
  if (!committedElsewhere || committedElsewhere.teamId === parsed.data.requestingTeamId) {
    return { ok: false, error: "Player must be committed to a different team first." };
  }

  await prisma.teamPlayerPlacement.upsert({
    where: {
      playerId_teamId: {
        playerId: parsed.data.playerId,
        teamId: parsed.data.requestingTeamId,
      },
    },
    create: {
      playerId: parsed.data.playerId,
      teamId: parsed.data.requestingTeamId,
      status: TeamPlayerPlacementStatus.GUEST_REQUESTED,
      placementType: TeamPlayerPlacementType.GUEST,
      requestedByCoachId: isCoachSession(session) ? session.coachId : null,
      notes: parsed.data.notes?.trim() || null,
    },
    update: {
      status: TeamPlayerPlacementStatus.GUEST_REQUESTED,
      placementType: TeamPlayerPlacementType.GUEST,
      requestedByCoachId: isCoachSession(session) ? session.coachId : null,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  await syncPlayerLifecycleFromPlacements(parsed.data.playerId);
  revalidateAfterRosterMutation([parsed.data.requestingTeamId, committedElsewhere.teamId]);
  return { ok: true };
}

export async function approveSecondaryByDirectorAction(formData: FormData): Promise<TeamRosterActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };

  const { staffRole } = await viewerStaffContext(session);
  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) return { ok: false, error: "Sign in as staff." };
    try {
      await assertDirector(session, staffRole);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Not authorized." };
    }
  }

  const parsed = approvePlacementIdSchema.safeParse({
    placementId: String(formData.get("placementId") ?? ""),
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid approval." };

  const placement = await prisma.teamPlayerPlacement.findFirst({
    where: { id: parsed.data.placementId },
  });
  if (!placement || placement.status !== TeamPlayerPlacementStatus.SECONDARY_REQUESTED) {
    return { ok: false, error: "Placement is not pending secondary approval." };
  }

  await prisma.teamPlayerPlacement.update({
    where: { id: placement.id },
    data: {
      status: TeamPlayerPlacementStatus.SECONDARY_APPROVED,
      approvedByDirectorId: isCoachSession(session) ? session.coachId : null,
      notes: parsed.data.notes?.trim() || placement.notes,
    },
  });

  await syncPlayerLifecycleFromPlacements(placement.playerId);
  revalidateAfterRosterMutation([placement.teamId]);
  return { ok: true };
}

export async function denySecondaryByDirectorAction(formData: FormData): Promise<TeamRosterActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };

  const { staffRole } = await viewerStaffContext(session);
  if (session.role !== "SUPER_ADMIN") {
    try {
      await assertDirector(session, staffRole);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Not authorized." };
    }
  }

  const parsed = approvePlacementIdSchema.safeParse({
    placementId: String(formData.get("placementId") ?? ""),
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid denial." };

  const placement = await prisma.teamPlayerPlacement.findFirst({
    where: { id: parsed.data.placementId },
  });
  if (!placement || placement.status !== TeamPlayerPlacementStatus.SECONDARY_REQUESTED) {
    return { ok: false, error: "Placement is not pending secondary approval." };
  }

  await prisma.teamPlayerPlacement.update({
    where: { id: placement.id },
    data: {
      status: TeamPlayerPlacementStatus.SECONDARY_DENIED,
      approvedByDirectorId: isCoachSession(session) ? session.coachId : null,
      notes: parsed.data.notes?.trim() || placement.notes,
    },
  });

  await syncPlayerLifecycleFromPlacements(placement.playerId);
  revalidateAfterRosterMutation([placement.teamId]);
  return { ok: true };
}

export async function approveGuestByHeadCoachAction(formData: FormData): Promise<TeamRosterActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && !isCoachSession(session))) {
    return { ok: false, error: "Sign in as staff." };
  }

  const parsed = approvePlacementIdSchema.safeParse({
    placementId: String(formData.get("placementId") ?? ""),
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid approval." };

  const placement = await prisma.teamPlayerPlacement.findFirst({
    where: { id: parsed.data.placementId },
  });
  if (!placement || placement.status !== TeamPlayerPlacementStatus.GUEST_REQUESTED) {
    return { ok: false, error: "Placement is not pending guest approval." };
  }

  const committed = await findCommittedPrimaryPlacement(placement.playerId);
  if (!committed) return { ok: false, error: "Player is not committed to a primary team." };

  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) return { ok: false, error: "Sign in as staff." };
    const headCoachId = await findHeadCoachIdForTeam(committed.teamId);
    if (!headCoachId || headCoachId !== session.coachId) {
      return { ok: false, error: "Only the committed team head coach can approve guest status." };
    }
  }

  await prisma.teamPlayerPlacement.update({
    where: { id: placement.id },
    data: {
      status: TeamPlayerPlacementStatus.GUEST_APPROVED,
      approvedByCoachId: isCoachSession(session) ? session.coachId : null,
      notes: parsed.data.notes?.trim() || placement.notes,
    },
  });

  await syncPlayerLifecycleFromPlacements(placement.playerId);
  revalidateAfterRosterMutation([placement.teamId, committed.teamId]);
  return { ok: true };
}

export async function denyGuestByHeadCoachAction(formData: FormData): Promise<TeamRosterActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && !isCoachSession(session))) {
    return { ok: false, error: "Sign in as staff." };
  }

  const parsed = approvePlacementIdSchema.safeParse({
    placementId: String(formData.get("placementId") ?? ""),
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid denial." };

  const placement = await prisma.teamPlayerPlacement.findFirst({
    where: { id: parsed.data.placementId },
  });
  if (!placement || placement.status !== TeamPlayerPlacementStatus.GUEST_REQUESTED) {
    return { ok: false, error: "Placement is not pending guest approval." };
  }

  const committed = await findCommittedPrimaryPlacement(placement.playerId);
  if (!committed) return { ok: false, error: "Player is not committed to a primary team." };

  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) return { ok: false, error: "Sign in as staff." };
    const headCoachId = await findHeadCoachIdForTeam(committed.teamId);
    if (!headCoachId || headCoachId !== session.coachId) {
      return { ok: false, error: "Only the committed team head coach can deny guest status." };
    }
  }

  await prisma.teamPlayerPlacement.update({
    where: { id: placement.id },
    data: {
      status: TeamPlayerPlacementStatus.GUEST_DENIED,
      approvedByCoachId: isCoachSession(session) ? session.coachId : null,
      notes: parsed.data.notes?.trim() || placement.notes,
    },
  });

  await syncPlayerLifecycleFromPlacements(placement.playerId);
  revalidateAfterRosterMutation([placement.teamId, committed.teamId]);
  return { ok: true };
}

export async function assignPlayerToTeamRosterAction(formData: FormData): Promise<TeamRosterActionResult> {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && !isCoachSession(session))) {
    return { ok: false, error: "Sign in as staff." };
  }

  const parsed = assignPlayerToTeamRosterSchema.safeParse({
    teamId: String(formData.get("teamId") ?? ""),
    playerId: String(formData.get("playerId") ?? ""),
    poolPlacementRole: String(formData.get("poolPlacementRole") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { poolPlacementRole, teamId: rosterTeamId, playerId: rosterPlayerId } = parsed.data;

  const { staffRole, primaryLocationId } = await viewerStaffContext(session);
  try {
    await assertCoachCanAccessTeamForMyTeam(session, staffRole, primaryLocationId, rosterTeamId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized." };
  }

  const team = await prisma.team.findFirst({
    where: { id: rosterTeamId },
    select: { id: true, gender: true, ageGroup: true, locationId: true, coachId: true },
  });
  if (!team) return { ok: false, error: "Team not found." };

  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) return { ok: false, error: "Sign in as staff." };
    const directorOk =
      staffRole === StaffRole.DIRECTOR &&
      primaryLocationId != null &&
      primaryLocationId === team.locationId;
    const coachOk =
      session.coachId === team.coachId || (await coachIsOnTeam(session.coachId, team.id));
    if (!directorOk && !coachOk) {
      return {
        ok: false,
        error: "You must be on this team’s staff or a director for this location to add players.",
      };
    }
  }

  const player = await prisma.player.findFirst({
    where: { id: rosterPlayerId },
    select: {
      id: true,
      assignedTeamId: true,
      playerStatus: true,
      gender: true,
      derivedAgeGroup: true,
      overrideAgeGroup: true,
      locationId: true,
    },
  });
  if (!player) return { ok: false, error: "Player not found." };
  if (player.playerStatus === PlayerStatus.ARCHIVED) {
    return { ok: false, error: "Cannot add an archived player to a roster." };
  }

  if (player.locationId !== team.locationId) {
    return { ok: false, error: "Player must be in the same club location as this team." };
  }

  if (
    !isPlayerEligibleForTeamPool(
      {
        gender: player.gender,
        effectiveAgeGroupLabel: player.overrideAgeGroup ?? player.derivedAgeGroup,
      },
      { gender: team.gender, ageGroup: team.ageGroup }
    )
  ) {
    return { ok: false, error: "Player is not eligible for this team’s pool (age/gender rules)." };
  }

  if (poolPlacementRole === "secondary" || poolPlacementRole === "guest") {
    if (player.assignedTeamId != null) {
      return {
        ok: false,
        error: "Add as secondary or guest from the pool requires the player to be unassigned.",
      };
    }
    const placementType =
      poolPlacementRole === "secondary"
        ? TeamPlayerPlacementType.SECONDARY
        : TeamPlayerPlacementType.GUEST;

    const existing = await prisma.teamPlayerPlacement.findUnique({
      where: {
        playerId_teamId: { playerId: player.id, teamId: rosterTeamId },
      },
    });

    if (existing) {
      if (existing.status !== TeamPlayerPlacementStatus.NOT_INTERESTED) {
        return {
          ok: false,
          error: "This player already has an active placement row for this team.",
        };
      }
      await prisma.teamPlayerPlacement.update({
        where: { id: existing.id },
        data: {
          status: TeamPlayerPlacementStatus.INVITED,
          placementType,
          requestedByCoachId: isCoachSession(session) ? session.coachId : null,
        },
      });
    } else {
      await prisma.teamPlayerPlacement.create({
        data: {
          playerId: player.id,
          teamId: rosterTeamId,
          status: TeamPlayerPlacementStatus.INVITED,
          placementType,
          requestedByCoachId: isCoachSession(session) ? session.coachId : null,
        },
      });
    }

    await syncPlayerLifecycleFromPlacements(player.id);
    revalidateAfterRosterMutation([rosterTeamId]);
    return { ok: true };
  }

  if (player.assignedTeamId === rosterTeamId) {
    return { ok: true };
  }

  const prevTeamId = player.assignedTeamId;

  await prisma.player.update({
    where: { id: player.id },
    data: { assignedTeamId: rosterTeamId },
  });

  await syncPrimaryPlacementFromAssignedTeamChange({
    playerId: player.id,
    fromAssignedTeamId: prevTeamId,
    toAssignedTeamId: rosterTeamId,
  });

  revalidateAfterRosterMutation([rosterTeamId, prevTeamId]);
  return { ok: true };
}

export async function assignPlayerToTeamRosterFormAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const roleRaw = String(formData.get("poolPlacementRole") ?? "primary");
  const role =
    roleRaw === "secondary" || roleRaw === "guest" || roleRaw === "primary" ? roleRaw : "primary";
  const result = await assignPlayerToTeamRosterAction(formData);
  if (!result.ok) {
    redirect(`/teams/${teamId}?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/teams/${teamId}?rosterAdded=1&pipelineRole=${role}`);
}

/** `<form action>` wrappers — Next form handlers expect `Promise<void>`, not a result payload. */
export async function transitionTeamPlacementFormAction(formData: FormData): Promise<void> {
  await transitionTeamPlacementAction(formData);
}

export async function approveSecondaryByDirectorFormAction(formData: FormData): Promise<void> {
  await approveSecondaryByDirectorAction(formData);
}

export async function denySecondaryByDirectorFormAction(formData: FormData): Promise<void> {
  await denySecondaryByDirectorAction(formData);
}

export async function approveGuestByHeadCoachFormAction(formData: FormData): Promise<void> {
  await approveGuestByHeadCoachAction(formData);
}

export async function denyGuestByHeadCoachFormAction(formData: FormData): Promise<void> {
  await denyGuestByHeadCoachAction(formData);
}
