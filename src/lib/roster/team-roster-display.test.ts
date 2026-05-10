import { describe, expect, it } from "vitest";
import { TeamPlayerPlacementStatus, TeamPlayerPlacementType } from "@prisma/client";
import { formatPlacementStatusLabel, formatPlacementTypeLabel } from "./team-roster-display";

describe("team-roster-display", () => {
  it("formats placement status for UI", () => {
    expect(formatPlacementStatusLabel(TeamPlayerPlacementStatus.INVITED)).toBe("Invited");
    expect(formatPlacementStatusLabel(TeamPlayerPlacementStatus.SECONDARY_DENIED)).toBe(
      "Secondary denied"
    );
  });

  it("formats placement type for UI", () => {
    expect(formatPlacementTypeLabel(TeamPlayerPlacementType.PRIMARY)).toBe("Primary");
    expect(formatPlacementTypeLabel(TeamPlayerPlacementType.GUEST)).toBe("Guest");
  });
});
