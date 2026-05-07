import { z } from "zod";

export const copyFieldWeekSchema = z.object({
  locationId: z.string().cuid(),
  sourceWeekAnchor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  destWeekAnchor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
});
