import type { Team } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

type PlayerForEdit = {
  createdByCoachId: string | null;
  assignedTeam: { coachId: string } | null;
};

export function canViewPlayerContact(
  session: SessionPayload,
  row: { createdByCoachId: string | null; assignedTeam: { coachId: string } | null }
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (!isCoachSession(session)) return false;
  if (row.createdByCoachId === session.coachId) return true;
  if (row.assignedTeam?.coachId === session.coachId) return true;
  return false;
}

export function canEditPlayer(
  session: SessionPayload,
  row: PlayerForEdit
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (!isCoachSession(session)) return false;
  if (row.createdByCoachId === session.coachId) return true;
  if (row.assignedTeam?.coachId === session.coachId) return true;
  return false;
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
