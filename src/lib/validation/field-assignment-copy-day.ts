import { z } from "zod";
import { parseYmdLocal } from "@/lib/fields/local-date";

export const copyComplexDaySchema = z
  .object({
    locationId: z.string().cuid(),
    complexId: z.string().cuid(),
    sourceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    destDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    recurrenceEndDate: z
      .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? undefined : v)),
  })
  .superRefine((data, ctx) => {
    const endRaw = data.recurrenceEndDate;
    if (endRaw) {
      const dest = parseYmdLocal(data.destDate);
      const end = parseYmdLocal(endRaw);
      if (Number.isNaN(dest.getTime()) || Number.isNaN(end.getTime())) return;
      if (end < dest) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Recurrence end must be on or after the first destination date.",
          path: ["recurrenceEndDate"],
        });
      }
    }
  });
