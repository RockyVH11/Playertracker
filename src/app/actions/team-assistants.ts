"use server";

import { StaffRole, TeamCoachRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import {
  assertCoachCanAccessTeamForMyTeam,
  coachIsOnTeam,
} from "@/lib/roster/my-team-rbac";
import { viewerStaffContext } from "@/lib/roster/team-roster-session";
import {
  addTeamAssistantCoachSchema,
  removeTeamAssistantCoachSchema,
} from "@/lib/validation/team-roster";

function backToTeam(teamId: string, error?: string) {
  const base = `/teams/${teamId}`;
  if (!error) return base;
  return `${base}?error=${encodeURIComponent(error)}`;
}

export async function addAssistantCoachAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = addTeamAssistantCoachSchema.safeParse({
    teamId: String(formData.get("teamId") ?? ""),
    coachId: String(formData.get("coachId") ?? ""),
  });
  if (!parsed.success) {
    redirect(backToTeam(String(formData.get("teamId") ?? ""), "Invalid assistant selection."));
  }

  const { teamId, coachId } = parsed.data;
  if (!coachId) {
    redirect(backToTeam(teamId));
  }

  if (session.role !== "SUPER_ADMIN" && !isCoachSession(session)) {
    redirect(backToTeam(teamId, "Sign in as staff."));
  }

  let headCoachId: string;
  try {
    const team = await guardAssistantManagement(session, teamId);
    headCoachId = team.coachId;
  } catch (e) {
    redirect(backToTeam(teamId, e instanceof Error ? e.message : "Not authorized."));
  }

  if (coachId === headCoachId) {
    redirect(backToTeam(teamId, "Head coach is already on this team."));
  }

  const exists = await prisma.teamCoach.findFirst({
    where: { teamId, coachId },
    select: { id: true },
  });
  if (exists) {
    redirect(backToTeam(teamId, "That coach is already on this team."));
  }

  await prisma.teamCoach.create({
    data: {
      teamId,
      coachId,
      role: TeamCoachRole.ASSISTANT_COACH,
    },
  });

  revalidatePath("/teams");
  revalidatePath(`/teams/${teamId}`);
  redirect(backToTeam(teamId));
}

async function guardAssistantManagement(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  teamId: string
) {
  const team = await prisma.team.findFirst({
    where: { id: teamId },
    select: { id: true, locationId: true, coachId: true },
  });
  if (!team) throw new Error("Team not found.");
  const { staffRole, primaryLocationId } = await viewerStaffContext(session);
  await assertCoachCanAccessTeamForMyTeam(session, staffRole, primaryLocationId, teamId);

  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) throw new Error("Sign in as staff.");
    const directorOk =
      staffRole === StaffRole.DIRECTOR &&
      primaryLocationId != null &&
      primaryLocationId === team.locationId;
    if (!directorOk && !(await coachIsOnTeam(session.coachId, teamId))) {
      throw new Error("Not authorized for this team.");
    }
  }
  return team;
}

export async function removeAssistantCoachAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = removeTeamAssistantCoachSchema.safeParse({
    teamId: String(formData.get("teamId") ?? ""),
    teamCoachId: String(formData.get("teamCoachId") ?? ""),
  });
  if (!parsed.success) {
    redirect(backToTeam(String(formData.get("teamId") ?? ""), "Invalid removal request."));
  }

  const { teamId, teamCoachId } = parsed.data;
  if (!teamCoachId) {
    redirect(backToTeam(teamId));
  }

  if (session.role !== "SUPER_ADMIN" && !isCoachSession(session)) {
    redirect(backToTeam(teamId, "Sign in as staff."));
  }

  try {
    await guardAssistantManagement(session, teamId);
  } catch (e) {
    redirect(backToTeam(teamId, e instanceof Error ? e.message : "Not authorized."));
  }

  const row = await prisma.teamCoach.findFirst({
    where: { id: teamCoachId, teamId },
    select: { id: true, role: true },
  });
  if (!row || row.role !== TeamCoachRole.ASSISTANT_COACH) {
    redirect(backToTeam(teamId, "Assistant record not found."));
  }

  await prisma.teamCoach.delete({ where: { id: row.id } });

  revalidatePath("/teams");
  revalidatePath(`/teams/${teamId}`);
  redirect(backToTeam(teamId));
}
