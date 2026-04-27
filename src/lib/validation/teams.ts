import { z } from "zod";
import { Gender } from "@prisma/client";

export const teamCreateSchema = z
  .object({
    seasonLabel: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, "Use format 2026-2027"),
    teamName: z.string().trim().min(1),
    locationId: z.string().min(1),
    gender: z.nativeEnum(Gender),
    ageGroup: z.string().trim().min(1),
    coachId: z.string().min(1),
    leagueId: z.string().optional().nullable(),
    openSession: z
      .union([z.literal("on"), z.literal("off")])
      .optional()
      .transform((v) => v === "on"),
    committedPlayerCount: z.coerce.number().int().min(0),
    coachEstimatedPlayerCount: z.coerce.number().int().min(0),
    recruitingNeeds: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .strict();

export const teamIdSchema = z.object({ id: z.string().cuid() });
