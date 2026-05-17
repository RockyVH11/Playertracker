import { createHmac, timingSafeEqual } from "crypto";

export function buildIntakeEditToken(
  playerId: string,
  expMs: number,
  signingKey: string
): string {
  const payload = `${playerId}.${expMs}`;
  const sig = createHmac("sha256", signingKey).update(payload).digest("hex");
  const json = JSON.stringify({ p: playerId, e: expMs, s: sig });
  return Buffer.from(json, "utf8").toString("base64url");
}

export function verifyIntakeEditToken(
  token: string,
  signingKey: string,
  nowMs: number
): { playerId: string } | null {
  let json: string;
  try {
    json = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return null;
  }
  let parsed: { p?: string; e?: number; s?: string };
  try {
    parsed = JSON.parse(json) as { p?: string; e?: number; s?: string };
  } catch {
    return null;
  }
  const playerId = parsed.p;
  const exp = parsed.e;
  const sig = parsed.s;
  if (!playerId || typeof exp !== "number" || !sig || exp < nowMs) return null;
  const payload = `${playerId}.${exp}`;
  const expected = createHmac("sha256", signingKey).update(payload).digest("hex");
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { playerId };
}
