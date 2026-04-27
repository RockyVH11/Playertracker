"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createPlayer, deletePlayer, updatePlayer } from "@/lib/services/players.service";
import { parseDobToUtcDate, playerCreateSchema } from "@/lib/validation/players";
import { EvaluationLevel, Gender, PlayerStatus } from "@prisma/client";
import { z } from "zod";

const updatePlayerSchema = playerCreateSchema.extend({ id: z.string().cuid() });

function parseNullableId(s: string | null) {
  if (!s || s.length === 0) return null;
  return s;
}

export async function createPlayerAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const raw = {
    seasonLabel: String(formData.get("seasonLabel") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    dob: String(formData.get("dob") ?? ""),
    gender: String(formData.get("gender") ?? "") as Gender,
    locationId: String(formData.get("locationId") ?? ""),
    assignedTeamId: parseNullableId(String(formData.get("assignedTeamId") ?? "")),
    leagueInterestId: parseNullableId(String(formData.get("leagueInterestId") ?? "")),
    playerStatus: (String(formData.get("playerStatus") ?? "") as PlayerStatus) || undefined,
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
    willingToPlayUp: raw.willingToPlayUp,
    overrideAgeGroup: raw.overrideAgeGroup,
    evaluationLevel: raw.evaluationLevel,
    evaluationNotes: raw.evaluationNotes || null,
    guardianName: raw.guardianName || null,
    guardianPhone: raw.guardianPhone || null,
    guardianEmail: raw.guardianEmail || null,
  });
  if (!parsed.success) {
    throw new Error("Invalid player");
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
  const { id, duplicateWarning } = await createPlayer({
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
      willingToPlayUp: p.willingToPlayUp,
      overrideAgeGroup: p.overrideAgeGroup ?? null,
      evaluationLevel: p.evaluationLevel,
      evaluationNotes: p.evaluationNotes ?? null,
      contact,
    },
  });
  revalidatePath("/players");
  const q = duplicateWarning ? "?duplicate=1" : "";
  redirect(`/players/${id}${q}`);
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
    willingToPlayUp: String(formData.get("willingToPlayUp") ?? "off") === "on" ? "on" : "off",
    overrideAgeGroup: String(formData.get("overrideAgeGroup") ?? ""),
    evaluationLevel: String(formData.get("evaluationLevel") ?? "") as EvaluationLevel,
    evaluationNotes: String(formData.get("evaluationNotes") ?? ""),
    guardianName: String(formData.get("guardianName") ?? ""),
    guardianPhone: String(formData.get("guardianPhone") ?? ""),
    guardianEmail: String(formData.get("guardianEmail") ?? ""),
  };
  const parsed = updatePlayerSchema.safeParse({ ...raw });
  if (!parsed.success) {
    throw new Error("Invalid player");
  }
  const p = parsed.data;
  const dob = parseDobToUtcDate(p.dob);
  const contact = {
    guardianName: p.guardianName ?? null,
    guardianPhone: p.guardianPhone ?? null,
    guardianEmail: p.guardianEmail ?? null,
  };
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
      willingToPlayUp: p.willingToPlayUp,
      overrideAgeGroup: p.overrideAgeGroup ?? null,
      evaluationLevel: p.evaluationLevel,
      evaluationNotes: p.evaluationNotes ?? null,
      contact: contact.guardianName || contact.guardianPhone || contact.guardianEmail
        ? contact
        : null,
    },
  });
  revalidatePath("/players");
  revalidatePath(`/players/${p.id}`);
  redirect(`/players/${p.id}`);
}

export async function deletePlayerAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "");
  await deletePlayer({ session, id });
  revalidatePath("/players");
  redirect("/players");
}
