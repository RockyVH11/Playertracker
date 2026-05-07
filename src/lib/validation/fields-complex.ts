import { z } from "zod";

export const fieldComplexLocationSchema = z.object({
  locationId: z.string().cuid("Invalid location."),
});

export const fieldComplexIdSchema = z.object({
  complexId: z.string().cuid("Invalid complex."),
});

export const fieldIdSchema = z.object({
  fieldId: z.string().cuid("Invalid field."),
});

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(160, "Name is too long.");

const notesSchema = z
  .string()
  .trim()
  .max(2000, "Notes are too long.")
  .optional();

export const createComplexSchema = z.object({
  locationId: z.string().cuid("Invalid location."),
  name: nameSchema,
  notes: notesSchema,
});

export const updateComplexSchema = z.object({
  complexId: z.string().cuid(),
  name: nameSchema,
  notes: notesSchema,
  isActive: z.boolean(),
});

export const createFieldSchema = z.object({
  complexId: z.string().cuid(),
  name: nameSchema,
  notes: notesSchema,
});

export const updateFieldSchema = z.object({
  fieldId: z.string().cuid(),
  name: nameSchema,
  notes: notesSchema,
  isActive: z.boolean(),
});
