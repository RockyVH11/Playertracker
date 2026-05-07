import { assignmentOverlapsSlot } from "@/lib/fields/assignment-intervals";

export function blackoutAppliesToField(
  b: { complexId: string; fieldId: string | null },
  field: { id: string; complexId: string }
): boolean {
  if (b.fieldId != null && b.fieldId === field.id) return true;
  if (b.fieldId == null && b.complexId === field.complexId) return true;
  return false;
}

/** Whether this blackout blocks the given slot row (30m window). */
export function blackoutBlocksSlot(
  b: { startTime: string | null; endTime: string | null },
  slotStart: string,
  slotMinutes: number
): boolean {
  if (b.startTime == null && b.endTime == null) return true;
  if (b.startTime == null || b.endTime == null) return true;
  return assignmentOverlapsSlot(b.startTime, b.endTime, slotStart, slotMinutes);
}
