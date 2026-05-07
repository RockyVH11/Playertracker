import { describe, expect, it } from "vitest";
import { StaffRole } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { directorPendingRequestsTotal } from "@/lib/nav/director-pending-counts";

function mockSession(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    role: "SUPER_ADMIN",
    ...overrides,
  } as SessionPayload;
}

describe("directorPendingRequestsTotal", () => {
  it("returns zero for coach without board access", async () => {
    const prisma = { fieldRequest: { count: async () => 99 } };
    const r = await directorPendingRequestsTotal(prisma as never, mockSession({ role: "COACH" }), StaffRole.COACH, "loc");
    expect(r).toEqual({ total: 0, fieldRequests: 0, equipmentRequests: 0 });
  });

  it("uses global pending count for super admin", async () => {
    let called = false;
    const prisma = {
      fieldRequest: {
        count: async (args: { where: unknown }) => {
          called = true;
          expect(args).toEqual({ where: expect.objectContaining({ status: "PENDING" }) });
          return 4;
        },
      },
    };
    const r = await directorPendingRequestsTotal(prisma as never, mockSession(), null, null);
    expect(called).toBe(true);
    expect(r.total).toBe(4);
    expect(r.fieldRequests).toBe(4);
    expect(r.equipmentRequests).toBe(0);
  });

  it("scopes field requests to director primary location", async () => {
    const prisma = {
      fieldRequest: {
        count: async (args: { where: { team?: { locationId: string } } }) => {
          expect(args.where.team?.locationId).toBe("primary-loc");
          return 2;
        },
      },
    };
    const r = await directorPendingRequestsTotal(
      prisma as never,
      mockSession({ role: "COACH" }),
      StaffRole.DIRECTOR,
      "primary-loc"
    );
    expect(r.fieldRequests).toBe(2);
    expect(r.total).toBe(2);
  });
});
