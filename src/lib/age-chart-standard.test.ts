import { describe, expect, it } from "vitest";
import {
  buildStandardAgeGroupRuleRows,
  dobRangeForStandardAgeGroup,
  nextSeasonLabel,
  parseSeasonStartYear,
} from "./age-chart-standard";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

describe("age-chart-standard", () => {
  it("parses season start year from label", () => {
    expect(parseSeasonStartYear("2026-2027")).toBe(2026);
    expect(parseSeasonStartYear(" 2030-2031")).toBe(2030);
  });

  it("advances season label by one calendar year each side", () => {
    expect(nextSeasonLabel("2026-2027")).toBe("2027-2028");
    expect(nextSeasonLabel("2030-2031")).toBe("2031-2032");
  });

  it("anchors U6 for 2026-2027 to Aug 2020 – Jul 2021", () => {
    const r = dobRangeForStandardAgeGroup(2026, "U6");
    expect(ymd(r.dobStart)).toBe("2020-08-01");
    expect(ymd(r.dobEnd)).toBe("2021-07-31");
  });

  it("anchors U19 for 2026-2027 to two-year window Aug 2007 – Jul 2009", () => {
    const r = dobRangeForStandardAgeGroup(2026, "U19");
    expect(ymd(r.dobStart)).toBe("2007-08-01");
    expect(ymd(r.dobEnd)).toBe("2009-07-31");
  });

  it("rolls U6 forward when season advances to 2027-2028", () => {
    const y = parseSeasonStartYear("2027-2028");
    const r = dobRangeForStandardAgeGroup(y, "U6");
    expect(ymd(r.dobStart)).toBe("2021-08-01");
    expect(ymd(r.dobEnd)).toBe("2022-07-31");
  });

  it("rolls U19 forward for 2027-2028", () => {
    const r = dobRangeForStandardAgeGroup(parseSeasonStartYear("2027-2028"), "U19");
    expect(ymd(r.dobStart)).toBe("2008-08-01");
    expect(ymd(r.dobEnd)).toBe("2010-07-31");
  });

  it("builds one row per chart age × gender", () => {
    const rows = buildStandardAgeGroupRuleRows("2026-2027");
    expect(rows.length).toBe(13 * 2);
    expect(new Set(rows.map((r) => r.ageGroup)).size).toBe(13);
  });
});
