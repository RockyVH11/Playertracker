import { StaffRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth/types";
import { isCoachSession } from "@/lib/auth/types";

export type StaffPageViewer =
  | { kind: "super_admin"; staffRole: null; coachId: null }
  | {
      kind: "coach_staff";
      staffRole: StaffRole;
      coachId: string;
      isActive: boolean;
    };

/** Resolve viewer for `/staff`; inactive coaches remain visible but only light editing is allowed elsewhere. */
export async function resolveStaffPageViewer(session: SessionPayload): Promise<StaffPageViewer | null> {
  if (session.role === "SUPER_ADMIN") {
    return { kind: "super_admin", staffRole: null, coachId: null };
  }
  if (!isCoachSession(session)) return null;
  const row = await prisma.coach.findFirst({
    where: { id: session.coachId },
    select: { id: true, staffRole: true, isActive: true },
  });
  if (!row) return null;
  return {
    kind: "coach_staff",
    staffRole: row.staffRole,
    coachId: row.id,
    isActive: row.isActive,
  };
}
