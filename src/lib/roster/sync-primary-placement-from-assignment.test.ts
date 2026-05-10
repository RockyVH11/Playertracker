import { describe, expect, it } from "vitest";
import { shouldTerminalPreviousPrimaryPlacement } from "./sync-primary-placement-from-assignment";

describe("shouldTerminalPreviousPrimaryPlacement", () => {
  it("is false when assignment unchanged", () => {
    expect(shouldTerminalPreviousPrimaryPlacement("t1", "t1")).toBe(false);
    expect(shouldTerminalPreviousPrimaryPlacement(null, null)).toBe(false);
  });

  it("is false when moving from pool to first team", () => {
    expect(shouldTerminalPreviousPrimaryPlacement(null, "t1")).toBe(false);
  });

  it("is true when switching teams or returning to pool", () => {
    expect(shouldTerminalPreviousPrimaryPlacement("t1", "t2")).toBe(true);
    expect(shouldTerminalPreviousPrimaryPlacement("t1", null)).toBe(true);
  });
});
