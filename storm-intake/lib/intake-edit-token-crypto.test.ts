import { describe, expect, it } from "vitest";
import { buildIntakeEditToken, verifyIntakeEditToken } from "./intake-edit-token-crypto";

describe("intake edit token crypto", () => {
  const key = "x".repeat(32);

  it("round-trips before expiry", () => {
    const now = 1_700_000_000_000;
    const token = buildIntakeEditToken("player-abc", now + 60_000, key);
    const v = verifyIntakeEditToken(token, key, now);
    expect(v).toEqual({ playerId: "player-abc" });
  });

  it("rejects expired token", () => {
    const now = 1_700_000_000_000;
    const token = buildIntakeEditToken("player-abc", now + 30_000, key);
    expect(verifyIntakeEditToken(token, key, now + 31_000)).toBeNull();
  });

  it("rejects wrong signing key", () => {
    const now = 1_700_000_000_000;
    const token = buildIntakeEditToken("player-abc", now + 60_000, key);
    expect(verifyIntakeEditToken(token, "y".repeat(32), now)).toBeNull();
  });

  it("rejects tampered payload", () => {
    const now = 1_700_000_000_000;
    const token = buildIntakeEditToken("player-abc", now + 60_000, key);
    const broken = token.slice(0, -4) + "qqqq";
    expect(verifyIntakeEditToken(broken, key, now)).toBeNull();
  });
});
