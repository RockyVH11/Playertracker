import { StaffRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import {
  canAccessFieldRequestsBoard,
  maySubmitFieldTimeRequest,
} from "@/lib/rbac-fields";

export type FieldRequestsBoardViewer = {
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  viewerStaffRole: import("@prisma/client").StaffRole | null;
  primaryLocationId: string | null;
};

export async function requireFieldRequestsBoardViewer(): Promise<FieldRequestsBoardViewer> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "SUPER_ADMIN") {
    return { session, viewerStaffRole: null, primaryLocationId: null };
  }
  if (!isCoachSession(session)) redirect("/login");
  const row = await prisma.coach.findFirst({
    where: { id: session.coachId, isActive: true },
    select: { staffRole: true, primaryLocationId: true },
  });
  if (!row) redirect("/login");
  if (!canAccessFieldRequestsBoard(session, row.staffRole)) redirect("/teams");
  return {
    session,
    viewerStaffRole: row.staffRole,
    primaryLocationId: row.primaryLocationId,
  };
}

export type FieldRequestSubmitter = {
  session: NonNullable<Awaited<ReturnType<typeof getSession>>> & {
    role: "COACH";
    coachId: string;
  };
  viewerStaffRole: import("@prisma/client").StaffRole;
};

export async function requireFieldRequestSubmitter(): Promise<FieldRequestSubmitter> {
  const session = await getSession();
  if (!session || !isCoachSession(session)) redirect("/login");
  const row = await prisma.coach.findFirst({
    where: { id: session.coachId, isActive: true },
    select: { staffRole: true },
  });
  if (!row) redirect("/login");
  if (!maySubmitFieldTimeRequest(session, row.staffRole)) redirect("/teams");
  return { session, viewerStaffRole: row.staffRole };
}

export async function assertCanModerateFieldRequest(
  v: FieldRequestsBoardViewer,
  requestId: string
) {
  const row = await prisma.fieldRequest.findFirst({
    where: { id: requestId },
    select: { team: { select: { locationId: true } } },
  });
  if (!row) throw new Error("not_found");
  if (v.session.role === "SUPER_ADMIN") return row;
  if (
    v.viewerStaffRole === StaffRole.DIRECTOR &&
    v.primaryLocationId === row.team.locationId
  ) {
    return row;
  }
  throw new Error("forbidden");
}
