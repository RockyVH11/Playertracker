import { DayOfWeek } from "@prisma/client";
import { z } from "zod";

/** Local wall-clock 24h `HH:mm`. */
export const HM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function hmToMinutes(hm: string): number | null {
  const t = hm.trim();
  if (!HM_REGEX.test(t)) return null;
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

const hmSchema = z
  .string()
  .trim()
  .regex(HM_REGEX, 'Use 24-hour times like "18:00".');

export const createAvailabilityWindowSchema = z
  .object({
    complexId: z.string().cuid(),
    dayOfWeek: z.nativeEnum(DayOfWeek),
    startTime: hmSchema,
    endTime: hmSchema,
    slotMinutes: z.coerce.number().int().min(5).max(120).refine((n) => n % 5 === 0, {
      message: "Slot length must be a multiple of 5 minutes.",
    }),
  })
  .superRefine((data, ctx) => {
    const a = hmToMinutes(data.startTime);
    const b = hmToMinutes(data.endTime);
    if (a == null || b == null) return;
    if (b <= a) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time (same calendar day).",
        path: ["endTime"],
      });
    }
  });

export const updateAvailabilityWindowSchema = z
  .object({
    availabilityId: z.string().cuid(),
    dayOfWeek: z.nativeEnum(DayOfWeek),
    startTime: hmSchema,
    endTime: hmSchema,
    slotMinutes: z.coerce.number().int().min(5).max(120).refine((n) => n % 5 === 0, {
      message: "Slot length must be a multiple of 5 minutes.",
    }),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const a = hmToMinutes(data.startTime);
    const b = hmToMinutes(data.endTime);
    if (a == null || b == null) return;
    if (b <= a) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time (same calendar day).",
        path: ["endTime"],
      });
    }
  });

export const createFieldAvailabilityWindowSchema = z
  .object({
    fieldId: z.string().cuid(),
    dayOfWeek: z.nativeEnum(DayOfWeek),
    startTime: hmSchema,
    endTime: hmSchema,
    slotMinutes: z.coerce.number().int().min(5).max(120).refine((n) => n % 5 === 0, {
      message: "Slot length must be a multiple of 5 minutes.",
    }),
  })
  .superRefine((data, ctx) => {
    const a = hmToMinutes(data.startTime);
    const b = hmToMinutes(data.endTime);
    if (a == null || b == null) return;
    if (b <= a) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time (same calendar day).",
        path: ["endTime"],
      });
    }
  });

export const updateFieldAvailabilityWindowSchema = z
  .object({
    fieldAvailabilityId: z.string().cuid(),
    dayOfWeek: z.nativeEnum(DayOfWeek),
    startTime: hmSchema,
    endTime: hmSchema,
    slotMinutes: z.coerce.number().int().min(5).max(120).refine((n) => n % 5 === 0, {
      message: "Slot length must be a multiple of 5 minutes.",
    }),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const a = hmToMinutes(data.startTime);
    const b = hmToMinutes(data.endTime);
    if (a == null || b == null) return;
    if (b <= a) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time (same calendar day).",
        path: ["endTime"],
      });
    }
  });
