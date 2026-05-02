import type { StaffRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { displayStaffRole } from "./staff-role-label";

export async function primaryAreaLabelFromLocationId(locationId: string) {
  const loc = await prisma.location.findUnique({
    where: { id: locationId },
    select: { name: true },
  });
  return loc?.name ?? null;
}

/** Sync picker CSV label from enum role for legacy consumers. */
export function staffPickerLabel(staffRole: StaffRole): string | null {
  return displayStaffRole(staffRole);
}
