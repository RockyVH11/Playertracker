import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DEFAULT_SEASON_LABEL: z.string().regex(/^\d{4}-\d{4}$/).default("2026-2027"),
  MAIN_APP_URL: z.string().url().default("http://localhost:3000"),
});

let cached: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (cached) return cached;
  const parsed = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    DEFAULT_SEASON_LABEL: process.env.DEFAULT_SEASON_LABEL,
    MAIN_APP_URL: process.env.MAIN_APP_URL,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  cached = parsed.data;
  return cached;
}

