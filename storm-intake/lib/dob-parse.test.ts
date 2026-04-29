import { describe, expect, it } from "vitest";
import { parseDobToUtcDate } from "./dob-parse";

describe("parseDobToUtcDate", () => {
  it("accepts six digits as MMDDYY with 20xx century", () => {
    const parsed = parseDobToUtcDate("010610");
    expect(parsed.toISOString().slice(0, 10)).toBe("2010-01-06");
  });

  it("accepts MM/DD/YY with 20xx century", () => {
    const parsed = parseDobToUtcDate("01/06/10");
    expect(parsed.toISOString().slice(0, 10)).toBe("2010-01-06");
  });

  it("accepts full MM/DD/YYYY", () => {
    const parsed = parseDobToUtcDate("01/06/2010");
    expect(parsed.toISOString().slice(0, 10)).toBe("2010-01-06");
  });
});
