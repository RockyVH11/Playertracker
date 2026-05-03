import { StaffRole } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { isCoachSession } from "@/lib/auth/types";

export type StaffRowEditMode = "none" | "contact_only" | "full";

/** Who may edit what for a Staff (Coach) row in the directory. */
export function staffRowEditMode(
  session: SessionPayload,
  opts: {
    viewerStaffRole: StaffRole | null;
    viewerCoachId: string | null;
    targetCoachId: string;
  }
): StaffRowEditMode {
  if (session.role === "SUPER_ADMIN") return "full";
  if (!isCoachSession(session)) return "none";

  const { viewerStaffRole, viewerCoachId, targetCoachId } = opts;
  if (!viewerCoachId || viewerStaffRole == null) return "none";

  if (viewerCoachId === targetCoachId) {
    if (viewerStaffRole === StaffRole.DIRECTOR) return "full";
    return "contact_only";
  }

  if (viewerStaffRole === StaffRole.DIRECTOR) return "full";

  return "none";
}

export function mayAddStaffMember(session: SessionPayload, viewerStaffRole: StaffRole | null) {
  if (session.role === "SUPER_ADMIN") return true;
  return viewerStaffRole === StaffRole.DIRECTOR;
}

export function mayDeleteStaffMember(session: SessionPayload) {
  return session.role === "SUPER_ADMIN";
}
