"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import {
  assertCanManageComplex,
  assertCanManageField,
  complexesIndexWithLocation,
  complexDetailPath,
  fieldInfraErr,
  requireFieldInfraSession,
} from "@/lib/server/field-infra-session";
import { canManageFieldComplexesForLocation } from "@/lib/rbac-fields";
import {
  createComplexSchema,
  createFieldSchema,
  updateComplexSchema,
  updateFieldSchema,
} from "@/lib/validation/fields-complex";

const err = fieldInfraErr;

export async function createComplexAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const rawLocationId = String(formData.get("locationId") ?? "").trim();
  const parsed = createComplexSchema.safeParse({
    locationId: rawLocationId,
    name: String(formData.get("name") ?? ""),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  const listHref = complexesIndexWithLocation(
    parsed.success ? parsed.data.locationId : rawLocationId
  );
  if (!parsed.success) {
    redirect(err(listHref, "Invalid complex name or location."));
  }
  const targetLoc = parsed.data.locationId;
  if (
    !canManageFieldComplexesForLocation(
      v.session,
      v.viewerStaffRole,
      v.primaryLocationId,
      targetLoc
    )
  ) {
    redirect(err(listHref, "Not authorized for that location."));
  }
  try {
    const c = await prisma.complex.create({
      data: {
        locationId: targetLoc,
        name: parsed.data.name,
        notes: parsed.data.notes ?? null,
      },
    });
    await auditLog(v.session, "Complex", c.id, "create", {
      locationId: c.locationId,
      name: c.name,
    });
  } catch {
    redirect(err(listHref, "Could not create complex."));
  }
  revalidatePath("/fields/complexes");
  redirect(`/fields/complexes?locationId=${encodeURIComponent(targetLoc)}`);
}

export async function updateComplexAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const cid = String(formData.get("complexId") ?? "");
  const pathComplex = complexDetailPath(cid);
  const parsed = updateComplexSchema.safeParse({
    complexId: cid,
    name: String(formData.get("name") ?? ""),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    redirect(err(pathComplex, "Invalid input."));
  }
  try {
    await assertCanManageComplex(v, parsed.data.complexId);
  } catch (e) {
    const row = await prisma.complex.findFirst({
      where: { id: cid },
      select: { locationId: true },
    });
    const back = complexesIndexWithLocation(row?.locationId);
    if ((e as Error).message === "not_found") {
      redirect(err(back, "Complex not found."));
    }
    redirect(err(back, "Not authorized."));
  }
  await prisma.complex.update({
    where: { id: parsed.data.complexId },
    data: {
      name: parsed.data.name,
      notes: parsed.data.notes ?? null,
      isActive: parsed.data.isActive,
    },
  });
  await auditLog(v.session, "Complex", parsed.data.complexId, "update", parsed.data);
  revalidatePath("/fields/complexes");
  revalidatePath(pathComplex);
  redirect(pathComplex);
}

export async function createFieldAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const complexIdRaw = String(formData.get("complexId") ?? "");
  const pathComplex = complexDetailPath(complexIdRaw);
  const parsed = createFieldSchema.safeParse({
    complexId: complexIdRaw,
    name: String(formData.get("name") ?? ""),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });
  if (!parsed.success) redirect(err(pathComplex, "Invalid field name."));
  try {
    await assertCanManageComplex(v, parsed.data.complexId);
  } catch {
    const row = await prisma.complex.findFirst({
      where: { id: parsed.data.complexId },
      select: { locationId: true },
    });
    redirect(
      err(
        complexesIndexWithLocation(row?.locationId),
        "Not authorized or complex missing."
      )
    );
  }
  try {
    const f = await prisma.field.create({
      data: {
        complexId: parsed.data.complexId,
        name: parsed.data.name,
        notes: parsed.data.notes ?? null,
      },
    });
    await auditLog(v.session, "Field", f.id, "create", {
      complexId: f.complexId,
      name: f.name,
    });
  } catch {
    redirect(err(pathComplex, "Could not create field."));
  }
  revalidatePath("/fields/complexes");
  revalidatePath(pathComplex);
  redirect(pathComplex);
}

export async function updateFieldAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const fid = String(formData.get("fieldId") ?? "");
  const parsed = updateFieldSchema.safeParse({
    fieldId: fid,
    name: String(formData.get("name") ?? ""),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    isActive: formData.get("isActive") === "on",
  });
  const fallback = "/fields/complexes";
  if (!parsed.success) {
    redirect(err(fallback, "Invalid field."));
  }
  let pathComplex = fallback;
  try {
    const row = await assertCanManageField(v, parsed.data.fieldId);
    pathComplex = complexDetailPath(row.complexId);
  } catch (e) {
    const row = await prisma.field.findFirst({
      where: { id: parsed.data.fieldId },
      select: { complex: { select: { locationId: true } } },
    });
    const back = complexesIndexWithLocation(row?.complex.locationId);
    if ((e as Error).message === "not_found") {
      redirect(err(back, "Field not found."));
    }
    redirect(err(back, "Not authorized."));
  }
  await prisma.field.update({
    where: { id: parsed.data.fieldId },
    data: {
      name: parsed.data.name,
      notes: parsed.data.notes ?? null,
      isActive: parsed.data.isActive,
    },
  });
  await auditLog(v.session, "Field", parsed.data.fieldId, "update", parsed.data);
  revalidatePath("/fields/complexes");
  revalidatePath(pathComplex);
  redirect(pathComplex);
}
