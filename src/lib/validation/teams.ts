import { z } from "zod";
import { Gender } from "@prisma/client";
import { isYouthAgeGroup } from "@/lib/data/age-groups";

export const teamCreateSchema = z
  .object({
    seasonLabel: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, "Use format 2026-2027"),
    teamName: z.string().trim().min(1).max(240),
    locationId: z.string().min(1),
    gender: z.nativeEnum(Gender),
    ageGroup: z
      .string()
      .trim()
      .refine(isYouthAgeGroup, "Select an age group (U6–U17 or U19)"),
    coachId: z.string().min(1),
    leagueId: z.string().optional().nullable(),
    openSession: z
      .union([z.literal("on"), z.literal("off")])
      .optional()
      .transform((v) => v === "on"),
    committedPlayerCount: z.coerce.number().int().min(0),
    coachEstimatedPlayerCount: z.coerce.number().int().min(0),
    returningPlayerCount: z.coerce.number().int().min(0).optional().default(0),
    neededPlayerCount: z.coerce.number().int().min(0).optional().default(0),
    neededGoalkeepers: z.coerce.number().int().min(0).optional().default(0),
    neededDefenders: z.coerce.number().int().min(0).optional().default(0),
    neededMidfielders: z.coerce.number().int().min(0).optional().default(0),
    neededForwards: z.coerce.number().int().min(0).optional().default(0),
    neededUtility: z.coerce.number().int().min(0).optional().default(0),
    recruitingNeeds: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .strict();

/** Validates create-team fields before the display name is resolved (auto vs manual). */
export const teamCreateFieldsWithoutNameSchema = teamCreateSchema.omit({ teamName: true });

export type TeamCreateWithoutNameInput = z.infer<typeof teamCreateFieldsWithoutNameSchema>;

export function firstTeamFormIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid team form.";
}

export const teamIdSchema = z.object({ id: z.string().cuid() });

export const teamCoachUpdateSchema = z
  .object({
    id: z.string().cuid(),
    coachEstimatedPlayerCount: z.coerce.number().int().min(0),
    recruitingNeeds: z.string().optional().nullable(),
  })
  .strict();

export const teamFilterSchema = z
  .object({
    seasonLabel: z.string().trim().regex(/^\d{4}-\d{4}$/).optional(),
    locationId: z.string().cuid().optional(),
    gender: z.nativeEnum(Gender).optional(),
    leagueId: z.string().cuid().optional(),
    openSession: z.enum(["any", "open", "closed"]).optional(),
    q: z.string().trim().max(80).optional(),
  })
  .strict();
