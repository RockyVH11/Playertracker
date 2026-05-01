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
    locationId: z.string().cuid("Pick a location"),
    gender: z.nativeEnum(Gender),
    ageGroup: z
      .string()
      .trim()
      .refine(isYouthAgeGroup, "Select an age group (U6–U17 or U19)"),
    coachId: z.string().cuid(),
    leagueId: z.string().optional().nullable(),
    /** Forms send "on"|"off"; squad-split drafts in cookies use booleans after JSON.parse. */
    openSession: z
      .union([z.boolean(), z.literal("on"), z.literal("off")])
      .optional()
      .transform((v) => v === true || v === "on"),
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
  });
  // Note: intentionally not `.strict()` — `<form action={serverAction}>` browsers / Next.js may attach
  // extra FormData entries; unknown keys are stripped by Zod objects by default.

/** Validates create-team fields before the display name is resolved (auto vs manual). */
export const teamCreateFieldsWithoutNameSchema = teamCreateSchema.omit({ teamName: true });

export type TeamCreateWithoutNameInput = z.infer<typeof teamCreateFieldsWithoutNameSchema>;

export function firstTeamFormIssueMessage(error: z.ZodError): string {
  const top = error.issues.slice(0, 3).map((i) => i.message);
  return top.join(" ") || "Invalid team form.";
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
    /** `"_none"` = teams whose `leagueId` is null (internal / no-pathway squads). */
    leagueId: z.union([z.literal("_none"), z.string().cuid()]).optional(),
    openSession: z.enum(["any", "open", "closed"]).optional(),
    q: z.string().trim().max(80).optional(),
  })
  .strict();
