import { StaffRole, TeamCoachRole } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

/** Coach is listed on the team (any role). */
export async function coachIsOnTeam(coachId: string, teamId: string): Promise<boolean> {
  const row = await prisma.teamCoach.findFirst({
    where: { coachId, teamId },
    select: { id: true },
  });
  return !!row;
}

export async function coachIsHeadCoach(coachId: string, teamId: string): Promise<boolean> {
  const row = await prisma.teamCoach.findFirst({
    where: { coachId, teamId, role: TeamCoachRole.HEAD_COACH },
    select: { id: true },
  });
  return !!row;
}

export async function assertCoachCanAccessTeamForMyTeam(
  session: SessionPayload,
  viewerStaffRole: StaffRole | null,
  primaryLocationId: string | null,
  teamId: string
): Promise<void> {
  const team = await prisma.team.findFirst({
    where: { id: teamId },
    select: { locationId: true },
  });
  if (!team) throw new Error("Team not found.");

  if (session.role === "SUPER_ADMIN") return;

  if (!isCoachSession(session)) throw new Error("Not authorized.");

  if (viewerStaffRole === StaffRole.DIRECTOR && primaryLocationId) {
    if (team.locationId !== primaryLocationId) throw new Error("Not authorized for this location.");
    return;
  }

  const onTeam = await coachIsOnTeam(session.coachId, teamId);
  if (!onTeam) throw new Error("Not authorized for this team.");
}

export async function assertDirector(session: SessionPayload, staffRole: StaffRole | null): Promise<void> {
  if (session.role === "SUPER_ADMIN") return;
  if (!isCoachSession(session)) throw new Error("Not authorized.");
  if (staffRole !== StaffRole.DIRECTOR) throw new Error("Director action only.");
}
