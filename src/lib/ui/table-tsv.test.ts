import { describe, expect, it } from "vitest";
import { normalizeCellText, tabDelimitedFromRows } from "./table-tsv";

describe("normalizeCellText", () => {
  it("collapses internal whitespace", () =>
    expect(normalizeCellText("  a\tb\n  c  ")).toBe("a b c"));

  it("trims edges", () => expect(normalizeCellText(" x ")).toBe("x"));

  it("handles empty string", () => expect(normalizeCellText("")).toBe(""));
});

describe("tabDelimitedFromRows", () => {
  it("joins columns with tabs and rows with newlines", () =>
    expect(
      tabDelimitedFromRows([
        ["a", "b"],
        ["1", "2"],
      ])
    ).toBe("a\tb\n1\t2"));

  it("drops empty row arrays", () =>
    expect(
      tabDelimitedFromRows([
        ["only"],
        [],
        ["row"],
      ])
    ).toBe("only\nrow"));
});
