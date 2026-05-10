import type { StaffRole } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

export async function viewerStaffContext(session: SessionPayload): Promise<{
  staffRole: StaffRole | null;
  primaryLocationId: string | null;
}> {
  if (!isCoachSession(session)) {
    return { staffRole: null, primaryLocationId: null };
  }
  const row = await prisma.coach.findFirst({
    where: { id: session.coachId, isActive: true },
    select: { staffRole: true, primaryLocationId: true },
  });
  return {
    staffRole: row?.staffRole ?? null,
    primaryLocationId: row?.primaryLocationId ?? null,
  };
}
