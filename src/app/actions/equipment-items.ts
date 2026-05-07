"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { canManageFieldComplexesForLocation } from "@/lib/rbac-fields";
import {
  fieldInfraErr,
  requireFieldInfraSession,
} from "@/lib/server/field-infra-session";
import {
  createEquipmentItemSchema,
  updateEquipmentItemSchema,
} from "@/lib/validation/equipment";

const err = fieldInfraErr;

function equipmentHref(locationId: string | undefined) {
  if (locationId) {
    return `/fields/equipment?locationId=${encodeURIComponent(locationId)}`;
  }
  return "/fields/equipment";
}

export async function createEquipmentItemAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const parsed = createEquipmentItemSchema.safeParse({
    locationId: String(formData.get("locationId") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    concurrentCapacity: String(formData.get("concurrentCapacity") ?? "1"),
  });
  const hint = String(formData.get("locationId") ?? "").trim();
  const fallback = equipmentHref(hint || undefined);

  if (!parsed.success) {
    redirect(err(fallback, "Invalid equipment name or location."));
  }

  const loc = parsed.data.locationId;
  if (
    !canManageFieldComplexesForLocation(
      v.session,
      v.viewerStaffRole,
      v.primaryLocationId,
      loc
    )
  ) {
    redirect(err(fallback, "Not authorized for that location."));
  }

  try {
    const row = await prisma.equipmentItem.create({
      data: {
        locationId: loc,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      },
    });
    await auditLog(v.session, "EquipmentItem", row.id, "create", {
      locationId: loc,
      name: row.name,
    });
  } catch {
    redirect(err(fallback, "Could not add equipment."));
  }

  revalidatePath("/fields/equipment");
  redirect(fallback);
}

export async function updateEquipmentItemAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const parsed = updateEquipmentItemSchema.safeParse({
    equipmentItemId: String(formData.get("equipmentItemId") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    concurrentCapacity: String(formData.get("concurrentCapacity") ?? "1"),
    isActive: formData.get("isActive") === "on",
  });
  const hint = String(formData.get("locationId") ?? "").trim();
  const fallback = equipmentHref(hint || undefined);

  if (!parsed.success) {
    redirect(err(fallback, "Invalid equipment update."));
  }

  const existing = await prisma.equipmentItem.findFirst({
    where: { id: parsed.data.equipmentItemId },
    select: { locationId: true },
  });
  if (!existing) {
    redirect(err(fallback, "Equipment not found."));
  }

  if (
    !canManageFieldComplexesForLocation(
      v.session,
      v.viewerStaffRole,
      v.primaryLocationId,
      existing.locationId
    )
  ) {
    redirect(err(fallback, "Not authorized."));
  }

  await prisma.equipmentItem.update({
    where: { id: parsed.data.equipmentItemId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      concurrentCapacity: parsed.data.concurrentCapacity,
      isActive: parsed.data.isActive,
    },
  });
  await auditLog(v.session, "EquipmentItem", parsed.data.equipmentItemId, "update", {
    name: parsed.data.name,
    concurrentCapacity: parsed.data.concurrentCapacity,
    isActive: parsed.data.isActive,
  });
  revalidatePath("/fields/equipment");
  redirect(fallback);
}
