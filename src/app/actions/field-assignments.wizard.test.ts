import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuditLog,
  mockRevalidatePath,
  mockRequireFieldInfraSession,
  mockPrisma,
} = vi.hoisted(() => ({
  mockAuditLog: vi.fn(async () => undefined),
  mockRevalidatePath: vi.fn(),
  mockRequireFieldInfraSession: vi.fn(async () => ({
    session: { role: "SUPER_ADMIN" as const },
    viewerStaffRole: null,
    primaryLocationId: null,
  })),
  mockPrisma: {
    field: { findFirst: vi.fn() },
    team: { findFirst: vi.fn() },
    fieldAssignment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/audit-log", () => ({
  auditLog: mockAuditLog,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/server/field-infra-session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/field-infra-session")>(
    "@/lib/server/field-infra-session"
  );
  return {
    ...actual,
    requireFieldInfraSession: mockRequireFieldInfraSession,
  };
});

import {
  createFieldAssignmentFromWizardDropAction,
  moveFieldAssignmentFromWizardDragAction,
} from "@/app/actions/field-assignments";

function buildDropFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("locationId", "cmad4n9pq0001s5w9zyxabcde");
  fd.set("complexId", "cmad4n9pq0002s5w9zyxabcde");
  fd.set("teamId", "cmad4n9pq0003s5w9zyxabcde");
  fd.set("fieldId", "cmad4n9pq0004s5w9zyxabcde");
  fd.set("assignmentDate", "2099-06-10");
  fd.set("startTime", "18:00");
  fd.set("windowStart", "17:00");
  fd.set("durationMinutes", "60");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

function buildMoveFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("locationId", "cmad4n9pq0001s5w9zyxabcde");
  fd.set("assignmentId", "cmad4n9pq0009s5w9zyxabcde");
  fd.set("fieldId", "cmad4n9pq0010s5w9zyxabcde");
  fd.set("assignmentDate", "2099-06-10");
  fd.set("startTime", "19:00");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

describe("field assignment wizard actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates assignment from wizard drop", async () => {
    mockPrisma.field.findFirst.mockResolvedValue({ id: "field-1" });
    mockPrisma.team.findFirst.mockResolvedValue({ id: "team-1", seasonLabel: "2026-2027" });
    mockPrisma.fieldAssignment.findMany.mockResolvedValue([]);
    mockPrisma.fieldAssignment.create.mockResolvedValue({ id: "new-assignment" });

    const res = await createFieldAssignmentFromWizardDropAction(buildDropFormData());

    expect(res).toEqual({ ok: true, assignmentId: "new-assignment" });
    expect(mockPrisma.fieldAssignment.create).toHaveBeenCalledOnce();
    expect(mockAuditLog).toHaveBeenCalledOnce();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/fields/schedule");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/fields/dashboard");
  });

  it("rejects wizard drop on peer conflict", async () => {
    mockPrisma.field.findFirst.mockResolvedValue({ id: "field-1" });
    mockPrisma.team.findFirst.mockResolvedValue({ id: "team-1", seasonLabel: "2026-2027" });
    mockPrisma.fieldAssignment.findMany.mockResolvedValue([
      {
        id: "existing-1",
        fieldId: "cmad4n9pq0004s5w9zyxabcde",
        teamId: "other-team",
        startTime: "18:00",
        endTime: "19:00",
      },
    ]);

    const res = await createFieldAssignmentFromWizardDropAction(buildDropFormData());

    expect(res.ok).toBe(false);
    expect((res as { ok: false; error: string }).error).toContain("overlapping this time");
    expect(mockPrisma.fieldAssignment.create).not.toHaveBeenCalled();
  });

  it("moves assignment from wizard drag", async () => {
    mockPrisma.fieldAssignment.findFirst.mockResolvedValue({
      id: "assign-1",
      teamId: "team-1",
      startTime: "18:00",
      endTime: "19:30",
      fieldId: "field-old",
    });
    mockPrisma.field.findFirst.mockResolvedValue({ id: "field-new" });
    mockPrisma.fieldAssignment.findMany.mockResolvedValue([]);

    const res = await moveFieldAssignmentFromWizardDragAction(buildMoveFormData());

    expect(res).toEqual({ ok: true });
    expect(mockPrisma.fieldAssignment.update).toHaveBeenCalledWith({
      where: { id: "assign-1" },
      data: {
        fieldId: "cmad4n9pq0010s5w9zyxabcde",
        startTime: "19:00",
        endTime: "20:30",
      },
    });
    expect(mockAuditLog).toHaveBeenCalledOnce();
  });

  it("returns not found when drag move source is missing", async () => {
    mockPrisma.fieldAssignment.findFirst.mockResolvedValue(null);

    const res = await moveFieldAssignmentFromWizardDragAction(buildMoveFormData());

    expect(res).toEqual({ ok: false, error: "Session not found for this date." });
    expect(mockPrisma.fieldAssignment.update).not.toHaveBeenCalled();
  });
});
