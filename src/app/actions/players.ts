"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createPlayer, deletePlayer, updatePlayer } from "@/lib/services/players.service";
import { prisma } from "@/lib/prisma";
import {
  firstPlayerFormIssueMessage,
  parseDobToUtcDate,
  playerCreateSchema,
  playerIdSchema,
  playerUpdateSchema,
} from "@/lib/validation/players";
import {
  EvaluationLevel,
  Gender,
  PlacementPriority,
  PlayerPosition,
  PlayerSource,
  PlayerStatus,
} from "@prisma/client";
import { auditLog } from "@/lib/audit-log";
import { StaffRole } from "@prisma/client";
import { isCoachSession } from "@/lib/auth/types";
import { canAssignPlayerToTeam, canUnassignPlayer } from "@/lib/rbac-team-building";
import { teamBuildingCommitSchema, teamBuildingUnassignSchema } from "@/lib/validation/team-building";

function parseNullableId(s: string | null) {
  if (!s || s.length === 0) return null;
  return s;
}

const POOL_GENERAL_SENTINEL = "__POOL_GENERAL__";

function playerErrorUrl(path: string, message: string) {
  return `${path}?error=${encodeURIComponent(message)}`;
}

export async function createPlayerAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const assignmentMode = String(formData.get("assignmentMode") ?? "pool");
  const rawAssignedTeamId = parseNullableId(String(formData.get("assignedTeamId") ?? ""));
  const rawLocationId = String(formData.get("locationId") ?? "");
  const assignedTeamId = assignmentMode === "team" ? rawAssignedTeamId : null;
  let locationId = rawLocationId;
  if (assignmentMode === "pool" && rawLocationId === POOL_GENERAL_SENTINEL) {
    const general = await prisma.location.upsert({
      where: { name: "Pool - General" },
      update: {},
      create: { name: "Pool - General" },
      select: { id: true },
    });
    locationId = general.id;
  }
  const raw = {
    seasonLabel: String(formData.get("seasonLabel") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    dob: String(formData.get("dob") ?? ""),
    gender: String(formData.get("gender") ?? "") as Gender,
    locationId,
    assignedTeamId,
    leagueInterestId: parseNullableId(String(formData.get("leagueInterestId") ?? "")),
    playerStatus: (String(formData.get("playerStatus") ?? "") as PlayerStatus) || undefined,
    primaryPosition: (String(formData.get("primaryPosition") ?? "") as PlayerPosition) || undefined,
    secondaryPosition: (String(formData.get("secondaryPosition") ?? "") as PlayerPosition) || undefined,
    playerSource: (String(formData.get("playerSource") ?? "") as PlayerSource) || undefined,
    placementPriority:
      (String(formData.get("placementPriority") ?? "") as PlacementPriority) || undefined,
    willingToPlayUp: String(formData.get("willingToPlayUp") ?? "off") === "on" ? "on" : "off",
    overrideAgeGroup: String(formData.get("overrideAgeGroup") ?? ""),
    evaluationLevel: String(formData.get("evaluationLevel") ?? "") as EvaluationLevel,
    evaluationNotes: String(formData.get("evaluationNotes") ?? ""),
    guardianName: String(formData.get("guardianName") ?? ""),
    guardianPhone: String(formData.get("guardianPhone") ?? ""),
    guardianEmail: String(formData.get("guardianEmail") ?? ""),
  };
  const parsed = playerCreateSchema.safeParse({
    seasonLabel: raw.seasonLabel,
    firstName: raw.firstName,
    lastName: raw.lastName,
    dob: raw.dob,
    gender: raw.gender,
    locationId: raw.locationId,
    assignedTeamId: raw.assignedTeamId,
    leagueInterestId: raw.leagueInterestId,
    playerStatus: raw.playerStatus,
    primaryPosition: raw.primaryPosition,
    secondaryPosition: raw.secondaryPosition,
    playerSource: raw.playerSource,
    placementPriority: raw.placementPriority,
    willingToPlayUp: raw.willingToPlayUp,
    overrideAgeGroup: raw.overrideAgeGroup,
    evaluationLevel: raw.evaluationLevel,
    evaluationNotes: raw.evaluationNotes || null,
    guardianName: raw.guardianName || null,
    guardianPhone: raw.guardianPhone || null,
    guardianEmail: raw.guardianEmail || null,
  });
  if (!parsed.success) {
    redirect(playerErrorUrl("/players/new", firstPlayerFormIssueMessage(parsed.error)));
  }
  const p = parsed.data;
  const dob = parseDobToUtcDate(p.dob);
  const contact =
    p.guardianName || p.guardianPhone || p.guardianEmail
      ? {
          guardianName: p.guardianName ?? null,
          guardianPhone: p.guardianPhone ?? null,
          guardianEmail: p.guardianEmail ?? null,
        }
      : null;
  let id: string;
  let duplicateWarning = false;
  try {
    const created = await createPlayer({
      session,
      data: {
        seasonLabel: p.seasonLabel,
        firstName: p.firstName,
        lastName: p.lastName,
        dob,
        gender: p.gender,
        locationId: p.locationId,
        assignedTeamId: p.assignedTeamId ?? null,
        leagueInterestId: p.leagueInterestId ?? null,
        playerStatus: p.playerStatus,
        primaryPosition: p.primaryPosition,
        secondaryPosition: p.secondaryPosition,
        playerSource: p.playerSource,
        placementPriority: p.placementPriority,
        willingToPlayUp: p.willingToPlayUp,
        overrideAgeGroup: p.overrideAgeGroup ?? null,
        evaluationLevel: p.evaluationLevel,
        evaluationNotes: p.evaluationNotes ?? null,
        contact,
      },
    });
    id = created.id;
    duplicateWarning = created.duplicateWarning;
  } catch {
    redirect(playerErrorUrl("/players/new", "Unable to create player."));
  }
  await auditLog(session, "Player", id, "create", {
    duplicateWarning,
  });
  revalidatePath("/players");
  const params = new URLSearchParams();
  params.set("promptAddAnother", "1");
  params.set("newPlayer", id);
  if (duplicateWarning) params.set("duplicate", "1");
  redirect(`/players?${params.toString()}`);
}

export async function updatePlayerAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const raw = {
    id: String(formData.get("id") ?? ""),
    seasonLabel: String(formData.get("seasonLabel") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    dob: String(formData.get("dob") ?? ""),
    gender: String(formData.get("gender") ?? "") as Gender,
    locationId: String(formData.get("locationId") ?? ""),
    assignedTeamId: parseNullableId(String(formData.get("assignedTeamId") ?? "")),
    leagueInterestId: parseNullableId(String(formData.get("leagueInterestId") ?? "")),
    playerStatus: String(formData.get("playerStatus") ?? "") as PlayerStatus,
    primaryPosition: (String(formData.get("primaryPosition") ?? "") as PlayerPosition) || undefined,
    secondaryPosition: (String(formData.get("secondaryPosition") ?? "") as PlayerPosition) || undefined,
    playerSource: (String(formData.get("playerSource") ?? "") as PlayerSource) || undefined,
    placementPriority:
      (String(formData.get("placementPriority") ?? "") as PlacementPriority) || undefined,
    willingToPlayUp: String(formData.get("willingToPlayUp") ?? "off") === "on" ? "on" : "off",
    overrideAgeGroup: String(formData.get("overrideAgeGroup") ?? ""),
    evaluationLevel: String(formData.get("evaluationLevel") ?? "") as EvaluationLevel,
    evaluationNotes: String(formData.get("evaluationNotes") ?? ""),
    guardianName: String(formData.get("guardianName") ?? ""),
    guardianPhone: String(formData.get("guardianPhone") ?? ""),
    guardianEmail: String(formData.get("guardianEmail") ?? ""),
  };
  const parsed = playerUpdateSchema.safeParse({ ...raw });
  if (!parsed.success) {
    redirect(playerErrorUrl(`/players/${raw.id}`, firstPlayerFormIssueMessage(parsed.error)));
  }
  const p = parsed.data;
  const dob = parseDobToUtcDate(p.dob);
  const contact = {
    guardianName: p.guardianName ?? null,
    guardianPhone: p.guardianPhone ?? null,
    guardianEmail: p.guardianEmail ?? null,
  };
  try {
    await updatePlayer({
      session,
      id: p.id,
      data: {
        seasonLabel: p.seasonLabel,
        firstName: p.firstName,
        lastName: p.lastName,
        dob,
        gender: p.gender,
        locationId: p.locationId,
        assignedTeamId: p.assignedTeamId ?? null,
        leagueInterestId: p.leagueInterestId ?? null,
        playerStatus: p.playerStatus,
        primaryPosition: p.primaryPosition,
        secondaryPosition: p.secondaryPosition,
        playerSource: p.playerSource,
        placementPriority: p.placementPriority,
        willingToPlayUp: p.willingToPlayUp,
        overrideAgeGroup: p.overrideAgeGroup ?? null,
        evaluationLevel: p.evaluationLevel,
        evaluationNotes: p.evaluationNotes ?? null,
        contact: contact.guardianName || contact.guardianPhone || contact.guardianEmail
          ? contact
          : null,
      },
    });
  } catch {
    redirect(playerErrorUrl(`/players/${p.id}`, "Unable to update this player."));
  }
  await auditLog(session, "Player", p.id, "update", {});
  revalidatePath("/players");
  revalidatePath(`/players/${p.id}`);
  revalidatePath(`/players/${p.id}/profile`);
  redirect("/players");
}

export async function deletePlayerAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "");
  if (!playerIdSchema.safeParse({ id }).success) {
    redirect(playerErrorUrl("/players", "Invalid player id."));
  }
  try {
    await deletePlayer({ session, id });
  } catch {
    redirect(playerErrorUrl(`/players/${id}`, "Unable to delete this player."));
  }
  await auditLog(session, "Player", id, "delete", {});
  revalidatePath("/players");
  revalidatePath("/dashboard");
  revalidatePath(`/players/${id}`);
  revalidatePath(`/players/${id}/profile`);
  redirect("/players");
}

type TeamBuildingResult = { ok: true } | { ok: false; error: string };

async function resolveTeamBuildingViewer(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return null;
  if (session.role === "SUPER_ADMIN") {
    return { session, viewerStaffRole: null, primaryLocationId: null };
  }
  if (!isCoachSession(session)) return null;
  const row = await prisma.coach.findFirst({
    where: { id: session.coachId, isActive: true },
    select: { staffRole: true, primaryLocationId: true },
  });
  if (!row) return null;
  return {
    session,
    viewerStaffRole: row.staffRole,
    primaryLocationId: row.primaryLocationId,
  };
}

export async function commitDraftPlayerAction(formData: FormData): Promise<TeamBuildingResult> {
  const session = await getSession();
  const viewer = await resolveTeamBuildingViewer(session);
  if (!viewer) return { ok: false, error: "Not authorized." };

  const parsed = teamBuildingCommitSchema.safeParse({
    playerId: String(formData.get("playerId") ?? ""),
    teamId: String(formData.get("teamId") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Invalid commit request." };

  const [player, team] = await Promise.all([
    prisma.player.findFirst({
      where: { id: parsed.data.playerId },
      select: {
        id: true,
        locationId: true,
        assignedTeamId: true,
        assignedTeam: { select: { coachId: true, locationId: true } },
      },
    }),
    prisma.team.findFirst({
      where: { id: parsed.data.teamId },
      select: { id: true, coachId: true, locationId: true },
    }),
  ]);
  if (!player || !team) return { ok: false, error: "Player or team not found." };

  if (player.assignedTeamId && player.assignedTeamId !== team.id) {
    return { ok: false, error: "Player is already assigned to another team." };
  }

  if (
    !canAssignPlayerToTeam(
      {
        session: viewer.session,
        viewerStaffRole: viewer.viewerStaffRole as StaffRole | null,
        primaryLocationId: viewer.primaryLocationId,
      },
      {
        locationId: player.locationId,
        assignedTeam: player.assignedTeam
          ? { coachId: player.assignedTeam.coachId, locationId: player.assignedTeam.locationId }
          : null,
      },
      { coachId: team.coachId, locationId: team.locationId }
    )
  ) {
    return { ok: false, error: "Not authorized to assign this player." };
  }

  await prisma.player.update({
    where: { id: player.id },
    data: { assignedTeamId: team.id },
  });
  await auditLog(viewer.session, "Player", player.id, "assign", { teamId: team.id, source: "team_building" });
  revalidatePath("/dashboard/team-building");
  revalidatePath("/dashboard");
  revalidatePath("/players");
  return { ok: true };
}

export async function unassignDraftPlayerAction(formData: FormData): Promise<TeamBuildingResult> {
  const session = await getSession();
  const viewer = await resolveTeamBuildingViewer(session);
  if (!viewer) return { ok: false, error: "Not authorized." };

  const parsed = teamBuildingUnassignSchema.safeParse({
    playerId: String(formData.get("playerId") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Invalid unassign request." };

  const player = await prisma.player.findFirst({
    where: { id: parsed.data.playerId },
    select: {
      id: true,
      locationId: true,
      assignedTeamId: true,
      assignedTeam: { select: { coachId: true, locationId: true } },
    },
  });
  if (!player || !player.assignedTeam) return { ok: false, error: "Player is not currently assigned." };

  if (
    !canUnassignPlayer(
      {
        session: viewer.session,
        viewerStaffRole: viewer.viewerStaffRole as StaffRole | null,
        primaryLocationId: viewer.primaryLocationId,
      },
      {
        locationId: player.locationId,
        assignedTeam: { coachId: player.assignedTeam.coachId, locationId: player.assignedTeam.locationId },
      }
    )
  ) {
    return { ok: false, error: "Not authorized to unassign this player." };
  }

  await prisma.player.update({ where: { id: player.id }, data: { assignedTeamId: null } });
  await auditLog(viewer.session, "Player", player.id, "unassign", { source: "team_building" });
  revalidatePath("/dashboard/team-building");
  revalidatePath("/dashboard");
  revalidatePath("/players");
  return { ok: true };
}
