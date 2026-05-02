import { ProspectStatus, ProspectType } from "@prisma/client";
import { z } from "zod";

const emailOrBlank = z
  .string()
  .trim()
  .max(320)
  .transform((v) => (v.length === 0 ? undefined : v))
  .optional();

const prospectCoreSchema = z.object({
  prospectType: z.nativeEnum(ProspectType),
  prospectName: z.string().trim().min(1).max(240),
  contactFirstName: z.string().trim().max(120).optional().nullable(),
  contactLastName: z.string().trim().max(120).optional().nullable(),
  contactPhone: z.string().trim().max(80).optional().nullable(),
  contactEmail: emailOrBlank,
  primaryLocationChoice: z.union([z.literal("unknown"), z.string().cuid()]),
  notes: z.string().trim().max(8000).optional().nullable(),
});

function refineProspectContactEmail<S extends z.ZodRawShape>(schema: z.ZodObject<S>) {
  return schema.superRefine((data, ctx) => {
    if (data.contactEmail) {
      const r = z.string().email().safeParse(data.contactEmail);
      if (!r.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid email",
          path: ["contactEmail"],
        });
      }
    }
  });
}

export const prospectCreateSchema = refineProspectContactEmail(prospectCoreSchema);

export type ProspectCreateInput = z.infer<typeof prospectCreateSchema>;

export const prospectDashboardFilterSchema = z.object({
  loc: z.string().optional(),
  prospectType: z.nativeEnum(ProspectType).optional(),
  status: z.nativeEnum(ProspectStatus).optional(),
  assignedToCoachId: z.string().optional(),
  submittedByCoachId: z.string().optional(),
});

export const prospectAssignSchema = z.object({
  prospectId: z.string().cuid(),
  assignedToCoachId: z.union([z.literal(""), z.string().cuid()]),
});

export const prospectCoachPatchSchema = z.object({
  prospectId: z.string().cuid(),
  status: z.nativeEnum(ProspectStatus),
  notes: z.string().trim().max(8000).optional().nullable(),
});

/** Full row replacement on the Director / Super Admin prospect board editor. */
export const prospectDirectorRowSchema = refineProspectContactEmail(
  prospectCoreSchema.extend({
    prospectId: z.string().cuid(),
    status: z.nativeEnum(ProspectStatus),
  })
);

export const prospectDeleteSchema = z.object({
  prospectId: z.string().cuid(),
});
