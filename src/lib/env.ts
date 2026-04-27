import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (s) => s.startsWith("postgres://") || s.startsWith("postgresql://"),
      "must be a postgres connection string"
    ),
  COACH_SHARED_PASSWORD: z.string().min(1),
  SUPER_ADMIN_PASSWORD: z.string().min(1),
  DEFAULT_SEASON_LABEL: z
    .string()
    .regex(/^\d{4}-\d{4}$/)
    .default("2026-2027"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .optional()
    .default("development"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let _cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (_cached) return _cached;
  const parsed = serverSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    COACH_SHARED_PASSWORD: process.env.COACH_SHARED_PASSWORD,
    SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD,
    DEFAULT_SEASON_LABEL: process.env.DEFAULT_SEASON_LABEL,
    NODE_ENV: process.env.NODE_ENV,
  });
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${message}`);
  }
  _cached = parsed.data;
  return _cached;
}
