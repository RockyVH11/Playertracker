"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createTeam, deleteTeam, updateTeam } from "@/lib/services/teams.service";
import { teamCreateSchema } from "@/lib/validation/teams";
import { Gender } from "@prisma/client";
import { z } from "zod";

const updateTeamSchema = teamCreateSchema.extend({ id: z.string().cuid() });

function parseLeagueId(s: string | null) {
  if (!s || s.length === 0) return null;
  return s;
}

export async function createTeamAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const raw = {
    seasonLabel: String(formData.get("seasonLabel") ?? ""),
    teamName: String(formData.get("teamName") ?? ""),
    locationId: String(formData.get("locationId") ?? ""),
    gender: String(formData.get("gender") ?? "") as Gender,
    ageGroup: String(formData.get("ageGroup") ?? ""),
    coachId: String(formData.get("coachId") ?? ""),
    leagueId: parseLeagueId(String(formData.get("leagueId") ?? "")),
    openSession: String(formData.get("openSession") ?? "off") === "on" ? "on" : "off",
    committedPlayerCount: String(formData.get("committedPlayerCount") ?? "0"),
    coachEstimatedPlayerCount: String(formData.get("coachEstimatedPlayerCount") ?? "0"),
    recruitingNeeds: String(formData.get("recruitingNeeds") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
  const parsed = teamCreateSchema.safeParse({
    seasonLabel: raw.seasonLabel,
    teamName: raw.teamName,
    locationId: raw.locationId,
    gender: raw.gender,
    ageGroup: raw.ageGroup,
    coachId: raw.coachId,
    leagueId: raw.leagueId,
    openSession: raw.openSession,
    committedPlayerCount: raw.committedPlayerCount,
    coachEstimatedPlayerCount: raw.coachEstimatedPlayerCount,
    recruitingNeeds: raw.recruitingNeeds || null,
    notes: raw.notes || null,
  });
  if (!parsed.success) {
    throw new Error("Invalid team form");
  }
  const p = parsed.data;
  const { id } = await createTeam({
    session,
    data: {
      seasonLabel: p.seasonLabel,
      teamName: p.teamName,
      locationId: p.locationId,
      gender: p.gender,
      ageGroup: p.ageGroup,
      coachId: p.coachId,
      leagueId: p.leagueId ?? null,
      openSession: p.openSession,
      committedPlayerCount: p.committedPlayerCount,
      coachEstimatedPlayerCount: p.coachEstimatedPlayerCount,
      recruitingNeeds: p.recruitingNeeds ?? null,
      notes: p.notes ?? null,
    },
  });
  revalidatePath("/teams");
  redirect(`/teams/${id}`);
}

export async function updateTeamAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const raw = {
    id,
    seasonLabel: String(formData.get("seasonLabel") ?? ""),
    teamName: String(formData.get("teamName") ?? ""),
    locationId: String(formData.get("locationId") ?? ""),
    gender: String(formData.get("gender") ?? "") as Gender,
    ageGroup: String(formData.get("ageGroup") ?? ""),
    coachId: String(formData.get("coachId") ?? ""),
    leagueId: parseLeagueId(String(formData.get("leagueId") ?? "")),
    openSession: String(formData.get("openSession") ?? "off") === "on" ? "on" : "off",
    committedPlayerCount: String(formData.get("committedPlayerCount") ?? "0"),
    coachEstimatedPlayerCount: String(formData.get("coachEstimatedPlayerCount") ?? "0"),
    recruitingNeeds: String(formData.get("recruitingNeeds") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
  const parsed = updateTeamSchema.safeParse({ ...raw });
  if (!parsed.success) {
    throw new Error("Invalid team form");
  }
  const p = parsed.data;
  if (session.role === "SUPER_ADMIN") {
    await updateTeam({
      session,
      id: p.id,
      data: {
        seasonLabel: p.seasonLabel,
        teamName: p.teamName,
        locationId: p.locationId,
        gender: p.gender,
        ageGroup: p.ageGroup,
        coachId: p.coachId,
        leagueId: p.leagueId ?? null,
        openSession: p.openSession,
        committedPlayerCount: p.committedPlayerCount,
        coachEstimatedPlayerCount: p.coachEstimatedPlayerCount,
        recruitingNeeds: p.recruitingNeeds ?? null,
        notes: p.notes ?? null,
      },
    });
  } else {
    await updateTeam({
      session,
      id: p.id,
      data: {
        coachEstimatedPlayerCount: p.coachEstimatedPlayerCount,
        recruitingNeeds: p.recruitingNeeds ?? null,
      },
    });
  }
  revalidatePath("/teams");
  revalidatePath(`/teams/${p.id}`);
  redirect(`/teams/${p.id}`);
}

export async function deleteTeamAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const id = String(formData.get("id") ?? "");
  if (!z.string().cuid().safeParse(id).success) {
    throw new Error("Invalid id");
  }
  await deleteTeam({ session, id });
  revalidatePath("/teams");
  redirect("/teams");
}
