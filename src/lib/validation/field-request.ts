import { DayOfWeek } from "@prisma/client";
import { z } from "zod";
import { HM_REGEX } from "@/lib/validation/fields-availability";

const hmSchema = z
  .string()
  .trim()
  .regex(HM_REGEX, 'Use 24-hour times like "18:00".');

const optionalCuid = z
  .union([z.literal(""), z.string().cuid()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const createFieldRequestSchema = z
  .object({
    teamId: z.string().cuid(),
    preferredDayOfWeek: z.nativeEnum(DayOfWeek),
    preferredStartTime: hmSchema,
    preferredSessionLengthMinutes: z.coerce
      .number()
      .int()
      .min(15)
      .max(360)
      .refine((n) => n % 15 === 0, {
        message: "Session length must be a multiple of 15 minutes.",
      }),
    preferredFieldId: optionalCuid,
    recurrenceRequested: z.boolean(),
    recurrenceEndDate: z.string().optional(),
    duplicateToOtherDays: z.array(z.nativeEnum(DayOfWeek)),
    notes: z
      .string()
      .trim()
      .max(2000)
      .transform((s) => (s === "" ? undefined : s)),
  })
  .superRefine((data, ctx) => {
    if (data.recurrenceRequested) {
      const d = data.recurrenceEndDate?.trim() ?? "";
      if (!d) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Recurrence end date is required when recurrence is on.",
          path: ["recurrenceEndDate"],
        });
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Use a calendar date (YYYY-MM-DD).",
          path: ["recurrenceEndDate"],
        });
      }
    }
  });

export const setFieldRequestStatusSchema = z.object({
  requestId: z.string().cuid(),
  status: z.enum(["APPROVED", "DENIED"]),
  directorNotes: z.string().max(2000).optional(),
});

/** Approve a pending request and create one concrete assignment (same day / slot rules as grid). */
export const approveFieldRequestWithAssignmentSchema = z
  .object({
    requestId: z.string().cuid(),
    assignmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    fieldId: z.string().cuid(),
    startTime: hmSchema,
    endTime: hmSchema,
    directorNotes: z
      .string()
      .trim()
      .max(2000)
      .transform((s) => (s === "" ? undefined : s)),
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
