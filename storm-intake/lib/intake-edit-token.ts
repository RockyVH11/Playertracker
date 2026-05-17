import { createHmac } from "crypto";
import { getEnv } from "@/lib/env";
import {
  buildIntakeEditToken as buildToken,
  verifyIntakeEditToken as verifyToken,
} from "./intake-edit-token-crypto";

const TTL_MS = 15 * 60 * 1000;

function signingKey(): string {
  const env = getEnv();
  const extra = env.INTAKE_EDIT_SECRET?.trim();
  if (extra && extra.length >= 16) return extra;
  return createHmac("sha256", "intake-edit-v1").update(env.DATABASE_URL).digest("hex");
}

export function createIntakeEditToken(playerId: string): string {
  const exp = Date.now() + TTL_MS;
  return buildToken(playerId, exp, signingKey());
}

export function verifyIntakeEditToken(token: string): { playerId: string } | null {
  return verifyToken(token, signingKey(), Date.now());
}
