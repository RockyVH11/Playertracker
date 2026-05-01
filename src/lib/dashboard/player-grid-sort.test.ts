import { describe, expect, it } from "vitest";
import {
  compareDashboardPlayerRows,
  nextPlayerGridSort,
  sortDashboardPlayerRows,
} from "./player-grid-sort";
import type { PlayerListRow } from "@/lib/services/players.service";
import {
  EvaluationLevel,
  Gender,
  PlacementPriority,
  PlayerPosition,
  PlayerSource,
  PlayerStatus,
} from "@prisma/client";

function row(partial: Partial<PlayerListRow> & Pick<PlayerListRow, "id" | "lastName" | "firstName">): PlayerListRow {
  const base: PlayerListRow = {
    id: partial.id,
    seasonLabel: "2026-2027",
    firstName: partial.firstName ?? "A",
    lastName: partial.lastName ?? "B",
    dob: partial.dob ?? new Date(Date.UTC(2012, 0, 15)),
    gender: partial.gender ?? Gender.GIRLS,
    derivedAgeGroup: partial.derivedAgeGroup ?? "U13",
    overrideAgeGroup: partial.overrideAgeGroup ?? null,
    locationId: "loc",
    location: partial.location ?? { id: "loc", name: "Midland" },
    assignedTeamId: partial.assignedTeamId ?? null,
    leagueInterestId: null,
    leagueInterest: null,
    playerStatus: partial.playerStatus ?? PlayerStatus.AVAILABLE,
    primaryPosition: partial.primaryPosition ?? PlayerPosition.UNKNOWN,
    secondaryPosition: partial.secondaryPosition ?? null,
    playerSource: partial.playerSource ?? PlayerSource.COACH_ENTERED,
    placementPriority: partial.placementPriority ?? PlacementPriority.MEDIUM,
    willingToPlayUp: partial.willingToPlayUp ?? false,
    evaluationLevel: partial.evaluationLevel ?? EvaluationLevel.NOT_EVALUATED,
    evaluationNotes: null,
    evaluationUpdatedAt: null,
    evaluationAuthorCoach: null,
    contact: null,
    createdByCoach: null,
    assignedTeam: partial.assignedTeam ?? null,
  };
  return { ...base, ...partial };
}

describe("nextPlayerGridSort", () => {
  it("first explicit sort chooses ascending", () => {
    expect(nextPlayerGridSort(undefined, undefined, "dob")).toEqual({ col: "dob", dir: "asc" });
    expect(nextPlayerGridSort(undefined, undefined, "player")).toEqual({ col: "player", dir: "asc" });
  });

  it("new column starts asc", () => {
    expect(nextPlayerGridSort("player", "desc", "dob")).toEqual({ col: "dob", dir: "asc" });
  });

  it("same column toggles", () => {
    expect(nextPlayerGridSort("player", "asc", "player")).toEqual({ col: "player", dir: "desc" });
    expect(nextPlayerGridSort("player", "desc", "player")).toEqual({ col: "player", dir: "asc" });
  });
});

describe("sortDashboardPlayerRows", () => {
  it("sorts by last name asc", () => {
    const a = row({ id: "1", lastName: "Zed", firstName: "A" });
    const b = row({ id: "2", lastName: "Ann", firstName: "B" });
    const out = sortDashboardPlayerRows([a, b], "player", "asc");
    expect(out.map((r) => r.lastName)).toEqual(["Ann", "Zed"]);
  });

  it("sorts by last name desc", () => {
    const a = row({ id: "1", lastName: "Ann", firstName: "A" });
    const b = row({ id: "2", lastName: "Zed", firstName: "B" });
    const out = sortDashboardPlayerRows([a, b], "player", "desc");
    expect(out.map((r) => r.lastName)).toEqual(["Zed", "Ann"]);
  });

  it("compares age groups", () => {
    const young = row({ id: "1", lastName: "A", firstName: "A", derivedAgeGroup: "U13" });
    const old = row({ id: "2", lastName: "B", firstName: "B", derivedAgeGroup: "U17" });
    expect(compareDashboardPlayerRows(young, old, "age")).toBeLessThan(0);
  });
});
