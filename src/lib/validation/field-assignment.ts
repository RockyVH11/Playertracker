import { z } from "zod";
import { HM_REGEX } from "@/lib/validation/fields-availability";

const hmSchema = z
  .string()
  .trim()
  .regex(HM_REGEX, 'Use 24-hour times like "18:00".');

export const createFieldAssignmentSchema = z
  .object({
    fieldId: z.string().cuid(),
    teamId: z.string().cuid(),
    assignmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    startTime: hmSchema,
    endTime: hmSchema,
    notes: z.string().trim().max(2000).optional(),
    sourceRequestId: z
      .union([z.literal(""), z.string().cuid()])
      .transform((v) => (v === "" ? undefined : v)),
  })
  .superRefine((data, ctx) => {
    const [sh, sm] = data.startTime.split(":").map(Number);
    const [eh, em] = data.endTime.split(":").map(Number);
    const s = sh * 60 + sm;
    const e = eh * 60 + em;
    if (e <= s) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time.",
        path: ["endTime"],
      });
    }
  });

export const deleteFieldAssignmentSchema = z.object({
  assignmentId: z.string().cuid(),
});

export const createFieldAssignmentFromWizardDropSchema = z.object({
  locationId: z.string().cuid(),
  complexId: z.string().cuid(),
  teamId: z.string().cuid(),
  fieldId: z.string().cuid(),
  assignmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  startTime: hmSchema,
  windowStart: hmSchema,
  durationMinutes: z.coerce.number().int().refine((n) => n === 30 || n === 60 || n === 90, {
    message: "Duration must be 30, 60, or 90 minutes.",
  }),
});

export const createRecurringFieldAssignmentsSchema = z.object({
  locationId: z.string().cuid(),
  complexId: z.string().cuid(),
  assignmentId: z.string().cuid(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  windowStart: hmSchema,
  durationMinutes: z.coerce
    .number()
    .int()
    .refine((n) => n === 30 || n === 60 || n === 90, {
      message: "Duration must be 30, 60, or 90 minutes.",
    }),
  weekdays: z.array(z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"])).min(1),
});

export const wizardDeleteFieldAssignmentSchema = z.object({
  assignmentId: z.string().cuid(),
  scope: z.enum(["this", "series"]),
});

export const moveFieldAssignmentFromWizardDragSchema = z.object({
  locationId: z.string().cuid(),
  assignmentId: z.string().cuid(),
  fieldId: z.string().cuid(),
  assignmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  startTime: hmSchema,
});

export const wizardUpdateFieldAssignmentSchema = z.object({
  locationId: z.string().cuid(),
  assignmentId: z.string().cuid(),
  scope: z.enum(["this", "series"]),
  fieldId: z.string().cuid(),
  startTime: hmSchema,
  durationMinutes: z.coerce.number().int().refine((n) => n === 30 || n === 60 || n === 90, {
    message: "Duration must be 30, 60, or 90 minutes.",
  }),
});
