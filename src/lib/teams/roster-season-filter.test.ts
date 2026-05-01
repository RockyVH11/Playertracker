import { describe, expect, it } from "vitest";
import { coerceRosterSeasonQueryParam } from "./roster-season-filter";

describe("coerceRosterSeasonQueryParam", () => {
  const fb = "2026-2027";

  it("returns canonical season when query is valid", () => {
    expect(coerceRosterSeasonQueryParam("  2027-2028  ", fb)).toBe("2027-2028");
  });

  it("falls back when query is junk (e.g. merged URL autocomplete)", () => {
    expect(coerceRosterSeasonQueryParam("20https://playertracker.example/teams", fb)).toBe(fb);
  });

  it("extracts season embedded in longer blob", () => {
    expect(
      coerceRosterSeasonQueryParam("foo 2029-2030 bar", fb)
    ).toBe("2029-2030");
  });

  it("falls back on reversed years", () => {
    expect(coerceRosterSeasonQueryParam("2028-2026", fb)).toBe(fb);
  });

  it("falls back when empty", () => {
    expect(coerceRosterSeasonQueryParam(undefined, fb)).toBe(fb);
    expect(coerceRosterSeasonQueryParam("   ", fb)).toBe(fb);
  });
});
