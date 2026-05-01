import { describe, expect, it } from "vitest";
import { ageGroupRank, ageGroupsBetween } from "./age-group-range";

describe("ageGroupRank", () => {
  it("parses standard labels", () => {
    expect(ageGroupRank("U13")).toBe(13);
    expect(ageGroupRank("u19")).toBe(19);
  });
});

describe("ageGroupsBetween", () => {
  it("returns undefined when both blank", () => {
    expect(ageGroupsBetween(undefined, undefined)).toBeUndefined();
  });

  it("ranges U13 to U19", () => {
    const labels = ageGroupsBetween("U13", "U19");
    expect(labels).toContain("U13");
    expect(labels).toContain("U17");
    expect(labels).toContain("U19");
    expect(labels).not.toContain("U12");
    expect(labels).not.toContain("U6");
  });

  it("handles reversed order", () => {
    const a = ageGroupsBetween("U19", "U13");
    const b = ageGroupsBetween("U13", "U19");
    expect(a).toEqual(b);
  });
});
