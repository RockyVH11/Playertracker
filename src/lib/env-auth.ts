import { z } from "zod";

const authSchema = z.object({
  SESSION_SECRET: z.string().min(32),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .optional()
    .default("development"),
});

let _cached: z.infer<typeof authSchema> | null = null;

/** Used for signing cookies; does not require database env. */
export function getAuthEnv() {
  if (_cached) return _cached;
  const parsed = authSchema.safeParse({
    SESSION_SECRET: process.env.SESSION_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });
  if (!parsed.success) {
    throw new Error(
      "SESSION_SECRET is required and must be at least 32 characters"
    );
  }
  _cached = parsed.data;
  return _cached;
}
