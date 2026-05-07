import { StaffRole } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { isCoachSession } from "@/lib/auth/types";

type TeamCtx = { coachId: string; locationId: string };
type PlayerCtx = { locationId: string; assignedTeam: TeamCtx | null };

type ViewerCtx = {
  session: SessionPayload;
  viewerStaffRole: StaffRole | null;
  primaryLocationId: string | null;
};

export function canAssignPlayerToTeam(viewer: ViewerCtx, player: PlayerCtx, targetTeam: TeamCtx): boolean {
  if (viewer.session.role === "SUPER_ADMIN") return true;
  if (!isCoachSession(viewer.session)) return false;

  if (viewer.viewerStaffRole === StaffRole.DIRECTOR) {
    return (
      viewer.primaryLocationId != null &&
      player.locationId === viewer.primaryLocationId &&
      targetTeam.locationId === viewer.primaryLocationId
    );
  }

  if (viewer.viewerStaffRole === StaffRole.COACH) {
    return targetTeam.coachId === viewer.session.coachId;
  }

  return false;
}

export function canUnassignPlayer(viewer: ViewerCtx, player: PlayerCtx): boolean {
  if (!player.assignedTeam) return false;
  if (viewer.session.role === "SUPER_ADMIN") return true;
  if (!isCoachSession(viewer.session)) return false;

  if (viewer.viewerStaffRole === StaffRole.DIRECTOR) {
    return (
      viewer.primaryLocationId != null &&
      player.locationId === viewer.primaryLocationId &&
      player.assignedTeam.locationId === viewer.primaryLocationId
    );
  }

  if (viewer.viewerStaffRole === StaffRole.COACH) {
    return player.assignedTeam.coachId === viewer.session.coachId;
  }

  return false;
}
