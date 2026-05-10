import { describe, expect, it } from "vitest";
import { PlayerStatus } from "@prisma/client";
import { normalizeLegacyPlayerStatusQueryParam } from "./legacy-player-status-query";

describe("normalizeLegacyPlayerStatusQueryParam", () => {
  it("returns undefined for empty input", () => {
    expect(normalizeLegacyPlayerStatusQueryParam(undefined)).toBeUndefined();
    expect(normalizeLegacyPlayerStatusQueryParam("")).toBeUndefined();
    expect(normalizeLegacyPlayerStatusQueryParam("   ")).toBeUndefined();
  });

  it("passes through current enum strings", () => {
    expect(normalizeLegacyPlayerStatusQueryParam("AVAILABLE")).toBe(
      PlayerStatus.AVAILABLE
    );
    expect(normalizeLegacyPlayerStatusQueryParam("ACTIVE")).toBe(PlayerStatus.ACTIVE);
    expect(normalizeLegacyPlayerStatusQueryParam("ARCHIVED")).toBe(
      PlayerStatus.ARCHIVED
    );
  });

  it("maps legacy recruiting statuses to lifecycle", () => {
    expect(normalizeLegacyPlayerStatusQueryParam("INVITED")).toBe(PlayerStatus.ACTIVE);
    expect(normalizeLegacyPlayerStatusQueryParam("COMMITTED")).toBe(
      PlayerStatus.ACTIVE
    );
    expect(normalizeLegacyPlayerStatusQueryParam("NOT_INTERESTED")).toBe(
      PlayerStatus.ARCHIVED
    );
  });

  it("ignores unknown tokens", () => {
    expect(normalizeLegacyPlayerStatusQueryParam("nope")).toBeUndefined();
  });
});
