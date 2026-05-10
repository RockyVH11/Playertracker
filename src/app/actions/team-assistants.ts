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
import { addTeamAssistantCoachSchema } from "@/lib/validation/team-roster";

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

  if (session.role !== "SUPER_ADMIN" && !isCoachSession(session)) {
    redirect(backToTeam(teamId, "Sign in as staff."));
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId },
    select: { id: true, coachId: true, locationId: true },
  });
  if (!team) redirect(backToTeam(teamId, "Team not found."));

  if (coachId === team.coachId) {
    redirect(backToTeam(teamId, "Head coach is already on this team."));
  }

  const { staffRole, primaryLocationId } = await viewerStaffContext(session);
  try {
    await assertCoachCanAccessTeamForMyTeam(session, staffRole, primaryLocationId, teamId);
  } catch (e) {
    redirect(backToTeam(teamId, e instanceof Error ? e.message : "Not authorized."));
  }

  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) redirect(backToTeam(teamId, "Sign in as staff."));
    const directorOk =
      staffRole === StaffRole.DIRECTOR &&
      primaryLocationId != null &&
      primaryLocationId === team.locationId;
    if (!directorOk && !(await coachIsOnTeam(session.coachId, teamId))) {
      redirect(backToTeam(teamId, "Not authorized for this team."));
    }
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
