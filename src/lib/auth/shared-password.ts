import { getServerEnv } from "@/lib/env";
import { z } from "zod";
import { AppRole } from "./types";

const loginInput = z
  .object({
    kind: z.enum(["SUPER_ADMIN", "COACH"]),
    password: z.string().min(1),
  })
  .strict();

export function verifySharedPassword(input: {
  kind: AppRole;
  password: string;
}): { ok: true } | { ok: false; reason: string } {
  const parsed = loginInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "Invalid request" };
  }
  const env = getServerEnv();
  if (parsed.data.kind === "SUPER_ADMIN") {
    if (parsed.data.password !== env.SUPER_ADMIN_PASSWORD) {
      return { ok: false, reason: "Invalid password" };
    }
    return { ok: true };
  }
  if (parsed.data.password !== env.COACH_SHARED_PASSWORD) {
    return { ok: false, reason: "Invalid password" };
  }
  return { ok: true };
}
