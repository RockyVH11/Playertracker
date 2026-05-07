import { z } from "zod";
import { HM_REGEX } from "@/lib/validation/fields-availability";

const hmOrEmpty = z.union([
  z.literal(""),
  z.string().trim().regex(HM_REGEX, 'Use 24-hour times like "18:00".'),
]);

export const createFieldBlackoutSchema = z
  .object({
    complexId: z.string().cuid(),
    fieldId: z
      .union([z.literal(""), z.string().cuid()])
      .transform((v) => (v === "" ? undefined : v)),
    blackoutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    startTime: hmOrEmpty.transform((v) => (v === "" ? null : v)),
    endTime: hmOrEmpty.transform((v) => (v === "" ? null : v)),
    reason: z.string().trim().max(500).optional().transform((s) => (s === "" ? undefined : s)),
  })
  .superRefine((data, ctx) => {
    const hasSt = data.startTime != null;
    const hasEn = data.endTime != null;
    if (hasSt !== hasEn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use both start and end times, or leave both blank for an all-day blackout.",
        path: ["startTime"],
      });
      return;
    }
    if (hasSt && data.startTime && data.endTime) {
      const [sh, sm] = data.startTime.split(":").map(Number);
      const [eh, em] = data.endTime.split(":").map(Number);
      const s = sh * 60 + sm;
      const e = eh * 60 + em;
      if (e <= s) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End must be after start.",
          path: ["endTime"],
        });
      }
    }
  });

export const deleteFieldBlackoutSchema = z.object({
  blackoutId: z.string().cuid(),
});
