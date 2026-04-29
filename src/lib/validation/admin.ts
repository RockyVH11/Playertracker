import { z } from "zod";
import { Gender } from "@prisma/client";

export const locationCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
});

export const locationIdSchema = z.object({
  id: z.string().cuid(),
});

const genderOrEmpty = z
  .union([z.literal(""), z.nativeEnum(Gender)])
  .transform((v) => (v === "" ? null : v));

const intOrNull = z.preprocess((v) => {
  if (v === "" || v == null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}, z.number().int().nullable());

export const leagueUpdateSchema = z.object({
  id: z.string().cuid(),
  allowedGender: genderOrEmpty,
  adminOverrideAllowed: z.coerce.boolean().optional().default(true),
  conference: z.string().trim().max(300).nullable().optional(),
  ageGroup: z.string().trim().max(120).nullable().optional(),
  hierarchy: intOrNull.optional(),
  capacity: z.preprocess((v) => {
    if (v === "" || v == null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
  }, z.number().int().min(0).nullable()),
  format: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});

export const ageRuleUpsertSchema = z.object({
  seasonLabel: z.string().regex(/^\d{4}-\d{4}$/),
  gender: z.nativeEnum(Gender),
  ageGroup: z.string().trim().min(1).max(20),
  dobStart: z.string().min(8),
  dobEnd: z.string().min(8),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export const ageRuleDeleteSchema = z.object({
  id: z.string().cuid(),
});

export const coachActiveSchema = z.object({
  coachId: z.string().cuid(),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const coachCreateSchema = z
  .object({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    email: z.string().trim().max(320),
    staffRoleLabel: z.string().trim().max(200),
    primaryAreaLabel: z.string().trim().min(1).max(200),
  })
  .transform((d) => ({
    firstName: d.firstName,
    lastName: d.lastName,
    email: d.email.length > 0 ? d.email : undefined,
    staffRoleLabel: d.staffRoleLabel.length > 0 ? d.staffRoleLabel : undefined,
    primaryAreaLabel: d.primaryAreaLabel,
  }))
  .superRefine((data, ctx) => {
    if (data.email) {
      const r = z.string().email().safeParse(data.email);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid email address",
          path: ["email"],
        });
      }
    }
  });
