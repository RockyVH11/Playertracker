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
