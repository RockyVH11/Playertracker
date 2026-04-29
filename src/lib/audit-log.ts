import { Role } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

/**
 * Records an audit trail entry for mutations. Errors are swallowed so logging never blocks UX.
 */
export async function auditLog(
  session: SessionPayload | null,
  entityType: string,
  entityId: string,
  action: string,
  payload?: unknown
): Promise<void> {
  if (!session) return;
  try {
    const actorRole =
      session.role === "SUPER_ADMIN" ? Role.SUPER_ADMIN : Role.COACH;
    await prisma.auditLog.create({
      data: {
        actorRole,
        actorUserId: null,
        entityType,
        entityId,
        action,
        payloadJson:
          payload !== undefined ? JSON.stringify(payload).slice(0, 65500) : null,
      },
    });
  } catch {
    /* avoid blocking primary operation */
  }
}
