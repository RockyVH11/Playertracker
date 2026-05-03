import { describe, expect, it } from "vitest";

/**
 * Mirrors `listPlayers` assignment where-clause precedence: a specific roster id must not be
 * replaced by `assigned: { not: null }`, which would broaden the filter to every rostered player.
 */
describe("listPlayers assignment where precedence", () => {
  it("uses exact assignedTeamId when provided alongside assigned intent", () => {
    const assignmentWhere = (assignedTeamId?: string, assignment?: "any" | "available" | "assigned") =>
      assignedTeamId
        ? { assignedTeamId: assignedTeamId }
        : assignment === "available"
          ? { assignedTeamId: null as const }
          : assignment === "assigned"
            ? { assignedTeamId: { not: null as const } }
            : {};

    expect(assignmentWhere("abc", "assigned")).toEqual({ assignedTeamId: "abc" });
    expect(assignmentWhere(undefined, "assigned")).toEqual({ assignedTeamId: { not: null } });
    expect(assignmentWhere(undefined, "available")).toEqual({ assignedTeamId: null });
    expect(assignmentWhere(undefined, "any")).toEqual({});
  });
});
