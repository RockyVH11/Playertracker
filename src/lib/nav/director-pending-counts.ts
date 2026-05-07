import { FieldRequestStatus, type StaffRole } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { canAccessFieldRequestsBoard } from "@/lib/rbac-fields";

/**
 * Counts actionable requests for nav badges (director / super admin).
 * Equipment “pending approval” workflow is not modeled yet — returns 0 until a status exists.
 */
export async function directorPendingRequestsTotal(
  prisma: {
    fieldRequest: { count: (args: unknown) => Promise<number> };
  },
  session: SessionPayload,
  viewerStaffRole: StaffRole | null,
  primaryLocationId: string | null
): Promise<{ total: number; fieldRequests: number; equipmentRequests: number }> {
  if (!canAccessFieldRequestsBoard(session, viewerStaffRole)) {
    return { total: 0, fieldRequests: 0, equipmentRequests: 0 };
  }

  let fieldRequests: number;
  if (session.role === "SUPER_ADMIN") {
    fieldRequests = await prisma.fieldRequest.count({
      where: { status: FieldRequestStatus.PENDING },
    });
  } else if (primaryLocationId) {
    fieldRequests = await prisma.fieldRequest.count({
      where: {
        status: FieldRequestStatus.PENDING,
        team: { locationId: primaryLocationId },
      },
    });
  } else {
    fieldRequests = 0;
  }

  const equipmentRequests = 0;
  const total = fieldRequests + equipmentRequests;
  return { total, fieldRequests, equipmentRequests };
}
