import { z } from "zod";
import {
  EvaluationLevel,
  Gender,
  PlacementPriority,
  PlayerPosition,
  PlayerSource,
  PlayerStatus,
} from "@prisma/client";
import { isYouthAgeGroup } from "@/lib/data/age-groups";

function parseDobStringLoose(s: string): Date | null {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Validates and normalizes ISO calendar DOB strings for storage. */
export function parseDobToUtcDate(s: string): Date {
  const t = s.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) {
    return new Date(
      Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0)
    );
  }
  const d = parseDobStringLoose(s);
  if (!d) {
    throw new Error("Invalid date of birth");
  }
  return d;
}

function isParsableDobField(s: string): boolean {
  try {
    parseDobToUtcDate(s);
    return true;
  } catch {
    return false;
  }
}

const requiredNameField = (fieldLabel: string) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, `${fieldLabel} is required.`));

const requiredDobField = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(1, "Date of birth is required.")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter date of birth as YYYY-MM-DD.")
      .refine((s) => isParsableDobField(s), "Date of birth is not a valid date.")
  );

/** Gender (sex) — required; must be a valid enum value from the form. */
const requiredGenderField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : ""),
  z.string().min(1, "Gender is required.").pipe(z.nativeEnum(Gender))
);

const playerCreateFieldsSchema = z
  .object({
    seasonLabel: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, "Use format 2026-2027"),
    firstName: requiredNameField("First name"),
    lastName: requiredNameField("Last name"),
    dob: requiredDobField,
    gender: requiredGenderField,
    locationId: z.string().min(1),
    assignedTeamId: z.string().optional().nullable(),
    leagueInterestId: z.string().optional().nullable(),
    playerStatus: z.preprocess(
      (v) => (v === "" || v == null ? PlayerStatus.AVAILABLE : v),
      z.nativeEnum(PlayerStatus)
    ),
    primaryPosition: z.preprocess(
      (v) => (v === "" || v == null ? PlayerPosition.UNKNOWN : v),
      z.nativeEnum(PlayerPosition)
    ),
    secondaryPosition: z.preprocess(
      (v) => (v === "" || v == null ? null : v),
      z.nativeEnum(PlayerPosition).nullable()
    ),
    playerSource: z.preprocess(
      (v) => (v === "" || v == null ? PlayerSource.COACH_ENTERED : v),
      z.nativeEnum(PlayerSource)
    ),
    placementPriority: z.preprocess(
      (v) => (v === "" || v == null ? PlacementPriority.MEDIUM : v),
      z.nativeEnum(PlacementPriority)
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

export function firstPlayerFormIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid player form.";
}

function superRefineYouthOverride(
  data: { overrideAgeGroup: string | null },
  ctx: z.RefinementCtx
) {
  if (
    data.overrideAgeGroup != null &&
    data.overrideAgeGroup.trim() !== "" &&
    !isYouthAgeGroup(data.overrideAgeGroup)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pick an age group from the list (U6–U17 or U19).",
      path: ["overrideAgeGroup"],
    });
  }
}

export const playerCreateSchema = playerCreateFieldsSchema.superRefine(
  superRefineYouthOverride
);

export const playerUpdateSchema = playerCreateFieldsSchema
  .extend({ id: z.string().cuid() })
  .strict()
  .superRefine(superRefineYouthOverride);

export const playerIdSchema = z.object({ id: z.string().cuid() }).strict();

export const playerFilterSchema = z
  .object({
    seasonLabel: z.string().trim().regex(/^\d{4}-\d{4}$/).optional(),
    q: z.string().trim().max(80).optional(),
    gender: z.nativeEnum(Gender).optional(),
    ageGroup: z
      .string()
      .trim()
      .max(16)
      .optional()
      .refine((s) => !s || isYouthAgeGroup(s), "Invalid age group filter"),
    locationId: z.string().cuid().optional(),
    leagueInterestId: z.string().cuid().optional(),
    evaluationLevel: z.nativeEnum(EvaluationLevel).optional(),
    assignedTeamId: z.string().cuid().optional(),
    assignment: z.enum(["any", "available", "assigned"]).optional(),
    playerStatus: z.nativeEnum(PlayerStatus).optional(),
    primaryPosition: z.nativeEnum(PlayerPosition).optional(),
  })
  .strict();
