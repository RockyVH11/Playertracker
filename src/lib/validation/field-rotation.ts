import { z } from "zod";
import { HM_REGEX } from "@/lib/validation/fields-availability";

const hmSchema = z
  .string()
  .trim()
  .regex(HM_REGEX, 'Use 24-hour times like "18:00".');

const durationSchema = z.coerce.number().int().refine((n) => n === 30 || n === 60 || n === 90, {
  message: "Duration must be 30, 60, or 90 minutes.",
});

const weekdaySchema = z.enum(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);

export const createFieldRotationGroupSchema = z.object({
  locationId: z.string().cuid(),
  complexId: z.string().cuid(),
  cadence: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
  startTime: hmSchema,
  durationMinutes: durationSchema,
  anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  recurrenceEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  weekdays: z.array(weekdaySchema).min(1),
  members: z
    .array(
      z.object({
        teamId: z.string().cuid(),
        primaryFieldId: z.string().cuid(),
        slotIndex: z.coerce.number().int().min(0).max(3),
      })
    )
    .min(2)
    .max(4),
});

export const deleteFieldRotationGroupSchema = z.object({
  locationId: z.string().cuid(),
  groupId: z.string().cuid(),
});

export const endFieldRotationMemberSchema = z.object({
  locationId: z.string().cuid(),
  groupId: z.string().cuid(),
  teamId: z.string().cuid(),
  memberEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
});
