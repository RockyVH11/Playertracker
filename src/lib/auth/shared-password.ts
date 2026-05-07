import { getServerEnv } from "@/lib/env";
import { z } from "zod";

const loginKinds = ["SUPER_ADMIN", "COACH", "DIRECTOR"] as const;

const loginInput = z
  .object({
    kind: z.enum(loginKinds),
    password: z.string().min(1),
  })
  .strict();

export type LoginSharedKind = z.infer<typeof loginInput>["kind"];

export function verifySharedPassword(input: {
  kind: LoginSharedKind;
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
  if (parsed.data.kind === "DIRECTOR") {
    if (parsed.data.password !== env.DIRECTOR_SHARED_PASSWORD) {
      return { ok: false, reason: "Invalid password" };
    }
    return { ok: true };
  }
  if (parsed.data.password !== env.COACH_SHARED_PASSWORD) {
    return { ok: false, reason: "Invalid password" };
  }
  return { ok: true };
}
