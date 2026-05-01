import { describe, expect, it } from "vitest";
import { teamFilterSchema } from "./teams";

describe("teamFilterSchema", () => {
  it("allows leagueId sentinel _none", () => {
    const r = teamFilterSchema.safeParse({
      seasonLabel: "2026-2027",
      leagueId: "_none",
      openSession: "any",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.leagueId).toBe("_none");
  });
});
