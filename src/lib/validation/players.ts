import { z } from "zod";
import { EvaluationLevel, Gender, PlayerStatus } from "@prisma/client";

export const playerCreateSchema = z
  .object({
    seasonLabel: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, "Use format 2026-2027"),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dob: z.string().min(1),
    gender: z.nativeEnum(Gender),
    locationId: z.string().min(1),
    assignedTeamId: z.string().optional().nullable(),
    leagueInterestId: z.string().optional().nullable(),
    playerStatus: z.preprocess(
      (v) => (v === "" || v == null ? PlayerStatus.AVAILABLE : v),
      z.nativeEnum(PlayerStatus)
    ),
    willingToPlayUp: z
      .union([z.literal("on"), z.literal("off")])
      .optional()
      .transform((v) => v === "on"),
    overrideAgeGroup: z
      .string()
      .optional()
      .transform((s) => (s && s.trim().length > 0 ? s.trim() : null)),
    evaluationLevel: z.nativeEnum(EvaluationLevel),
    evaluationNotes: z.string().optional().nullable(),
    guardianName: z.string().optional().nullable(),
    guardianPhone: z.string().optional().nullable(),
    guardianEmail: z.string().optional().nullable(),
  })
  .strict();

export const playerUpdateSchema = playerCreateSchema
  .extend({ id: z.string().cuid() })
  .strict();

function parseDobString(s: string): Date | null {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function parseDobToUtcDate(s: string): Date {
  const t = s.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) {
    return new Date(
      Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0)
    );
  }
  const d = parseDobString(s);
  if (!d) {
    throw new Error("Invalid date of birth");
  }
  return d;
}
