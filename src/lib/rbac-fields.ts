import { StaffRole } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { isCoachSession } from "@/lib/auth/types";

/** Super admin or director may open field infrastructure admin (complexes, availability, etc.). */
export function mayAccessFieldInfrastructureAdmin(
  session: SessionPayload,
  viewerStaffRole: StaffRole | null
): boolean {
  return session.role === "SUPER_ADMIN" || viewerStaffRole === StaffRole.DIRECTOR;
}

/**
 * Director may only manage complexes/fields tied to their primary location.
 * Super admin may manage any location.
 */
export function canManageFieldComplexesForLocation(
  session: SessionPayload,
  viewerStaffRole: StaffRole | null,
  viewerPrimaryLocationId: string | null,
  targetLocationId: string
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (viewerStaffRole !== StaffRole.DIRECTOR || !viewerPrimaryLocationId) return false;
  return viewerPrimaryLocationId === targetLocationId;
}

/** Director board + super admin. */
export function canAccessFieldRequestsBoard(
  session: SessionPayload,
  viewerStaffRole: StaffRole | null
): boolean {
  return session.role === "SUPER_ADMIN" || viewerStaffRole === StaffRole.DIRECTOR;
}

/** Coach or director (session coach) may submit; managers are read-only for schedules. */
export function maySubmitFieldTimeRequest(
  session: SessionPayload,
  viewerStaffRole: StaffRole | null
): boolean {
  if (viewerStaffRole === StaffRole.MANAGER) return false;
  if (session.role === "SUPER_ADMIN") return false;
  return (
    session.role === "COACH" &&
    (viewerStaffRole === StaffRole.COACH || viewerStaffRole === StaffRole.DIRECTOR)
  );
}

/** Same gate as `/fields/equipment`: super admin, director (infra), or coach session that may request field time. */
export function mayAccessEquipment(
  session: SessionPayload,
  viewerStaffRole: StaffRole | null
): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (mayAccessFieldInfrastructureAdmin(session, viewerStaffRole)) return true;
  return (
    isCoachSession(session) &&
    maySubmitFieldTimeRequest(session, viewerStaffRole)
  );
}
