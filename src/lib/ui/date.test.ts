import { describe, expect, it } from "vitest";
import { parseDashYmdToUtcDate, toYmdUtc } from "./date";

describe("parseDashYmdToUtcDate", () => {
  it("parses UTC date", () => {
    const d = parseDashYmdToUtcDate("2012-06-15");
    expect(d).toBeDefined();
    expect(toYmdUtc(d!)).toBe("2012-06-15");
  });

  it("returns undefined on invalid", () => {
    expect(parseDashYmdToUtcDate("")).toBeUndefined();
    expect(parseDashYmdToUtcDate("13/01/2020")).toBeUndefined();
  });
});
