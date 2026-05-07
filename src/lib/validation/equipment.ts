import { z } from "zod";
import { HM_REGEX } from "@/lib/validation/fields-availability";

const hmSchema = z
  .string()
  .trim()
  .regex(HM_REGEX, 'Use 24-hour times like "18:00".');

export const createEquipmentItemSchema = z.object({
  locationId: z.string().cuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().transform((s) => (s === "" ? undefined : s)),
  concurrentCapacity: z.coerce.number().int().min(1).max(99),
});

export const updateEquipmentItemSchema = z.object({
  equipmentItemId: z.string().cuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().transform((s) => (s === "" ? undefined : s)),
  concurrentCapacity: z.coerce.number().int().min(1).max(99),
  isActive: z.boolean(),
});

export const createEquipmentReservationSchema = z
  .object({
    equipmentItemId: z.string().cuid(),
    teamId: z.string().cuid(),
    reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    startTime: hmSchema,
    endTime: hmSchema,
    quantity: z.coerce.number().int().min(1).max(99),
    linkedFieldAssignmentId: z.union([z.literal(""), z.string().cuid()]).transform((v) =>
      v === "" ? undefined : v
    ),
    notes: z.string().trim().max(2000).optional().transform((s) => (s === "" ? undefined : s)),
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

export const cancelEquipmentReservationSchema = z.object({
  reservationId: z.string().cuid(),
});

/** Scheduling wizard: drop catalog item onto a field assignment chip. */
export const wizardEquipmentDropOnAssignmentSchema = z.object({
  locationId: z.string().trim().min(1),
  equipmentItemId: z.string().cuid(),
  fieldAssignmentId: z.string().cuid(),
  quantity: z
    .preprocess((v) => {
      if (v === undefined || v === null || v === "") return 1;
      return v;
    }, z.coerce.number().int().min(1).max(99)),
});
