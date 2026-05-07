import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import {
  canManageFieldComplexesForLocation,
  mayAccessFieldInfrastructureAdmin,
} from "@/lib/rbac-fields";

export type FieldInfraViewer = {
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  viewerStaffRole: import("@prisma/client").StaffRole | null;
  primaryLocationId: string | null;
};

export function fieldInfraErr(path: string, msg: string) {
  return `${path}?error=${encodeURIComponent(msg)}`;
}

/** Super admin list URL with locked location when we have a valid id. */
export function complexesIndexWithLocation(locationId: string | undefined | null): string {
  const id = typeof locationId === "string" ? locationId.trim() : "";
  if (z.string().cuid().safeParse(id).success) {
    return `/fields/complexes?locationId=${encodeURIComponent(id)}`;
  }
  return "/fields/complexes";
}

export function complexDetailPath(complexId: string) {
  return `/fields/complexes/${complexId}`;
}

export async function requireFieldInfraSession(): Promise<FieldInfraViewer> {
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
  if (!mayAccessFieldInfrastructureAdmin(session, row.staffRole)) redirect("/teams");
  return {
    session,
    viewerStaffRole: row.staffRole,
    primaryLocationId: row.primaryLocationId,
  };
}

export async function assertCanManageComplex(v: FieldInfraViewer, complexId: string) {
  const row = await prisma.complex.findFirst({
    where: { id: complexId },
    select: { locationId: true },
  });
  if (!row) throw new Error("not_found");
  if (
    !canManageFieldComplexesForLocation(
      v.session,
      v.viewerStaffRole,
      v.primaryLocationId,
      row.locationId
    )
  ) {
    throw new Error("forbidden");
  }
  return row;
}

export async function assertCanManageField(v: FieldInfraViewer, fieldId: string) {
  const row = await prisma.field.findFirst({
    where: { id: fieldId },
    select: {
      complexId: true,
      complex: { select: { locationId: true } },
    },
  });
  if (!row) throw new Error("not_found");
  if (
    !canManageFieldComplexesForLocation(
      v.session,
      v.viewerStaffRole,
      v.primaryLocationId,
      row.complex.locationId
    )
  ) {
    throw new Error("forbidden");
  }
  return row;
}

export async function assertCanManageAvailabilityWindow(
  v: FieldInfraViewer,
  availabilityId: string
) {
  const row = await prisma.complexAvailability.findFirst({
    where: { id: availabilityId },
    select: {
      complexId: true,
      complex: { select: { locationId: true } },
    },
  });
  if (!row) throw new Error("not_found");
  if (
    !canManageFieldComplexesForLocation(
      v.session,
      v.viewerStaffRole,
      v.primaryLocationId,
      row.complex.locationId
    )
  ) {
    throw new Error("forbidden");
  }
  return row;
}

export async function assertCanManageFieldAvailabilityWindow(
  v: FieldInfraViewer,
  fieldAvailabilityId: string
) {
  const row = await prisma.fieldAvailability.findFirst({
    where: { id: fieldAvailabilityId },
    select: {
      fieldId: true,
      field: { select: { complexId: true, complex: { select: { locationId: true } } } },
    },
  });
  if (!row) throw new Error("not_found");
  if (
    !canManageFieldComplexesForLocation(
      v.session,
      v.viewerStaffRole,
      v.primaryLocationId,
      row.field.complex.locationId
    )
  ) {
    throw new Error("forbidden");
  }
  return row;
}
