import { describe, expect, it } from "vitest";
import { normName } from "./strings";

describe("normName", () => {
  it("trims and lowercases", () => {
    expect(normName("  Alex ")).toBe("alex");
  });
});
