import { describe, expect, it } from "vitest";
import { dashboardHref, serializeDashboardQuery } from "./dashboard-query-params";

describe("serializeDashboardQuery", () => {
  it("includes player sort when set", () => {
    const s = serializeDashboardQuery({
      seasonLabel: "2026-2027",
      pSort: "dob",
      pDir: "desc",
    });
    expect(s).toContain("pSort=dob");
    expect(s).toContain("pDir=desc");
  });
});

describe("dashboardHref", () => {
  it("prefixes dashboard path", () => {
    expect(dashboardHref({ seasonLabel: "2026-2027", pSort: "player", pDir: "asc" }).startsWith("/dashboard"));
  });
});
