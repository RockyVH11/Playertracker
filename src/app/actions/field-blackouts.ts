"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditLog } from "@/lib/audit-log";
import { parseYmdLocal } from "@/lib/fields/local-date";
import { prisma } from "@/lib/prisma";
import { canManageFieldComplexesForLocation } from "@/lib/rbac-fields";
import {
  fieldInfraErr,
  requireFieldInfraSession,
} from "@/lib/server/field-infra-session";
import {
  createFieldBlackoutSchema,
  deleteFieldBlackoutSchema,
} from "@/lib/validation/field-blackout";

const err = fieldInfraErr;

function blackoutsHref(locationId: string | undefined) {
  if (locationId) {
    return `/fields/blackouts?locationId=${encodeURIComponent(locationId)}`;
  }
  return "/fields/blackouts";
}

export async function createFieldBlackoutAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const parsed = createFieldBlackoutSchema.safeParse({
    complexId: String(formData.get("complexId") ?? ""),
    fieldId: String(formData.get("fieldId") ?? ""),
    blackoutDate: String(formData.get("blackoutDate") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });
  const locHint = String(formData.get("locationId") ?? "").trim();
  const fallback = blackoutsHref(locHint || undefined);

  if (!parsed.success) {
    redirect(err(fallback, "Invalid blackout (check date and times)."));
  }

  const complex = await prisma.complex.findFirst({
    where: { id: parsed.data.complexId, isActive: true },
    select: { locationId: true },
  });
  if (!complex) {
    redirect(err(fallback, "Complex not found."));
  }

  if (
    !canManageFieldComplexesForLocation(
      v.session,
      v.viewerStaffRole,
      v.primaryLocationId,
      complex.locationId
    )
  ) {
    redirect(err(fallback, "Not authorized."));
  }

  if (parsed.data.fieldId) {
    const fieldOk = await prisma.field.findFirst({
      where: {
        id: parsed.data.fieldId,
        complexId: parsed.data.complexId,
        isActive: true,
      },
    });
    if (!fieldOk) {
      redirect(err(fallback, "Field must belong to the selected complex."));
    }
  }

  const blackoutDate = parseYmdLocal(parsed.data.blackoutDate);

  try {
    const row = await prisma.fieldBlackout.create({
      data: {
        complexId: parsed.data.complexId,
        fieldId: parsed.data.fieldId ?? null,
        blackoutDate,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        reason: parsed.data.reason ?? null,
      },
    });
    await auditLog(v.session, "FieldBlackout", row.id, "create", {
      complexId: row.complexId,
      fieldId: row.fieldId,
      blackoutDate: parsed.data.blackoutDate,
    });
  } catch {
    redirect(err(fallback, "Could not create blackout."));
  }

  revalidatePath("/fields/blackouts");
  revalidatePath("/fields/schedule");
  redirect(fallback);
}

export async function deleteFieldBlackoutAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const parsed = deleteFieldBlackoutSchema.safeParse({
    blackoutId: String(formData.get("blackoutId") ?? ""),
  });
  const locHint = String(formData.get("locationId") ?? "").trim();
  const fallback = blackoutsHref(locHint || undefined);

  if (!parsed.success) {
    redirect(err(fallback, "Invalid blackout."));
  }

  const existing = await prisma.fieldBlackout.findFirst({
    where: { id: parsed.data.blackoutId },
    include: { complex: { select: { locationId: true } } },
  });
  if (!existing) {
    redirect(err(fallback, "Blackout not found."));
  }

  if (
    !canManageFieldComplexesForLocation(
      v.session,
      v.viewerStaffRole,
      v.primaryLocationId,
      existing.complex.locationId
    )
  ) {
    redirect(err(fallback, "Not authorized."));
  }

  await prisma.fieldBlackout.delete({ where: { id: parsed.data.blackoutId } });
  await auditLog(v.session, "FieldBlackout", parsed.data.blackoutId, "delete", {});
  revalidatePath("/fields/blackouts");
  revalidatePath("/fields/schedule");
  redirect(fallback);
}
