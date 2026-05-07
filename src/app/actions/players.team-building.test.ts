import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSession, mockAuditLog, mockRevalidatePath, mockPrisma } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockAuditLog: vi.fn(async () => undefined),
  mockRevalidatePath: vi.fn(),
  mockPrisma: {
    coach: { findFirst: vi.fn() },
    player: { findFirst: vi.fn(), update: vi.fn() },
    team: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/audit-log", () => ({ auditLog: mockAuditLog }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { commitDraftPlayerAction, unassignDraftPlayerAction } from "@/app/actions/players";

function fd(data: Record<string, string>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(data)) form.set(k, v);
  return form;
}

describe("players team-building actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("commits an unassigned player for super admin", async () => {
    mockGetSession.mockResolvedValue({ role: "SUPER_ADMIN", coachId: null });
    mockPrisma.player.findFirst.mockResolvedValue({
      id: "cmad4n9pq0001s5w9zyxabcde",
      locationId: "loc-1",
      assignedTeamId: null,
      assignedTeam: null,
    });
    mockPrisma.team.findFirst.mockResolvedValue({
      id: "cmad4n9pq0002s5w9zyxabcde",
      coachId: "coach-1",
      locationId: "loc-1",
    });

    const res = await commitDraftPlayerAction(
      fd({
        playerId: "cmad4n9pq0001s5w9zyxabcde",
        teamId: "cmad4n9pq0002s5w9zyxabcde",
      })
    );

    expect(res).toEqual({ ok: true });
    expect(mockPrisma.player.update).toHaveBeenCalledWith({
      where: { id: "cmad4n9pq0001s5w9zyxabcde" },
      data: { assignedTeamId: "cmad4n9pq0002s5w9zyxabcde" },
    });
    expect(mockAuditLog).toHaveBeenCalledOnce();
  });

  it("blocks commit when player is already assigned elsewhere", async () => {
    mockGetSession.mockResolvedValue({ role: "SUPER_ADMIN", coachId: null });
    mockPrisma.player.findFirst.mockResolvedValue({
      id: "cmad4n9pq0001s5w9zyxabcde",
      locationId: "loc-1",
      assignedTeamId: "cmad4n9pq0009s5w9zyxabcde",
      assignedTeam: { coachId: "coach-z", locationId: "loc-1" },
    });
    mockPrisma.team.findFirst.mockResolvedValue({
      id: "cmad4n9pq0002s5w9zyxabcde",
      coachId: "coach-1",
      locationId: "loc-1",
    });

    const res = await commitDraftPlayerAction(
      fd({
        playerId: "cmad4n9pq0001s5w9zyxabcde",
        teamId: "cmad4n9pq0002s5w9zyxabcde",
      })
    );

    expect(res).toEqual({ ok: false, error: "Player is already assigned to another team." });
    expect(mockPrisma.player.update).not.toHaveBeenCalled();
  });

  it("prevents coach from committing to another coach team", async () => {
    mockGetSession.mockResolvedValue({ role: "COACH", coachId: "coach-1" });
    mockPrisma.coach.findFirst.mockResolvedValue({
      staffRole: "COACH",
      primaryLocationId: "loc-1",
    });
    mockPrisma.player.findFirst.mockResolvedValue({
      id: "cmad4n9pq0001s5w9zyxabcde",
      locationId: "loc-1",
      assignedTeamId: null,
      assignedTeam: null,
    });
    mockPrisma.team.findFirst.mockResolvedValue({
      id: "cmad4n9pq0002s5w9zyxabcde",
      coachId: "coach-2",
      locationId: "loc-1",
    });

    const res = await commitDraftPlayerAction(
      fd({
        playerId: "cmad4n9pq0001s5w9zyxabcde",
        teamId: "cmad4n9pq0002s5w9zyxabcde",
      })
    );

    expect(res).toEqual({ ok: false, error: "Not authorized to assign this player." });
  });

  it("allows coach to unassign player from own team", async () => {
    mockGetSession.mockResolvedValue({ role: "COACH", coachId: "coach-1" });
    mockPrisma.coach.findFirst.mockResolvedValue({
      staffRole: "COACH",
      primaryLocationId: "loc-1",
    });
    mockPrisma.player.findFirst.mockResolvedValue({
      id: "cmad4n9pq0001s5w9zyxabcde",
      locationId: "loc-1",
      assignedTeamId: "cmad4n9pq0002s5w9zyxabcde",
      assignedTeam: { coachId: "coach-1", locationId: "loc-1" },
    });

    const res = await unassignDraftPlayerAction(fd({ playerId: "cmad4n9pq0001s5w9zyxabcde" }));

    expect(res).toEqual({ ok: true });
    expect(mockPrisma.player.update).toHaveBeenCalledWith({
      where: { id: "cmad4n9pq0001s5w9zyxabcde" },
      data: { assignedTeamId: null },
    });
  });

  it("prevents coach from unassigning other team players", async () => {
    mockGetSession.mockResolvedValue({ role: "COACH", coachId: "coach-1" });
    mockPrisma.coach.findFirst.mockResolvedValue({
      staffRole: "COACH",
      primaryLocationId: "loc-1",
    });
    mockPrisma.player.findFirst.mockResolvedValue({
      id: "cmad4n9pq0001s5w9zyxabcde",
      locationId: "loc-1",
      assignedTeamId: "cmad4n9pq0002s5w9zyxabcde",
      assignedTeam: { coachId: "coach-2", locationId: "loc-1" },
    });

    const res = await unassignDraftPlayerAction(fd({ playerId: "cmad4n9pq0001s5w9zyxabcde" }));

    expect(res).toEqual({ ok: false, error: "Not authorized to unassign this player." });
    expect(mockPrisma.player.update).not.toHaveBeenCalled();
  });
});
