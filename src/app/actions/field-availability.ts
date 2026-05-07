"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import {
  assertCanManageAvailabilityWindow,
  assertCanManageComplex,
  assertCanManageField,
  assertCanManageFieldAvailabilityWindow,
  complexDetailPath,
  fieldInfraErr,
  requireFieldInfraSession,
} from "@/lib/server/field-infra-session";
import {
  createAvailabilityWindowSchema,
  createFieldAvailabilityWindowSchema,
  updateAvailabilityWindowSchema,
  updateFieldAvailabilityWindowSchema,
  hmToMinutes,
} from "@/lib/validation/fields-availability";

const err = fieldInfraErr;

function withinAnyWindow(startTime: string, endTime: string, windows: { startTime: string; endTime: string }[]) {
  const start = hmToMinutes(startTime);
  const end = hmToMinutes(endTime);
  if (start == null || end == null) return false;
  return windows.some((w) => {
    const wStart = hmToMinutes(w.startTime);
    const wEnd = hmToMinutes(w.endTime);
    if (wStart == null || wEnd == null) return false;
    return start >= wStart && end <= wEnd;
  });
}

export async function createAvailabilityWindowAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const complexIdRaw = String(formData.get("complexId") ?? "").trim();
  const pathComplex = complexDetailPath(complexIdRaw);
  const parsed = createAvailabilityWindowSchema.safeParse({
    complexId: complexIdRaw,
    dayOfWeek: String(formData.get("dayOfWeek") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    slotMinutes: String(formData.get("slotMinutes") ?? "30"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    const msg =
      f.dayOfWeek?.[0] ??
      f.startTime?.[0] ??
      f.endTime?.[0] ??
      f.slotMinutes?.[0] ??
      f.complexId?.[0] ??
      "Invalid availability window.";
    redirect(err(pathComplex, msg));
  }
  try {
    await assertCanManageComplex(v, parsed.data.complexId);
  } catch {
    redirect(err(pathComplex, "Not authorized."));
  }
  try {
    const row = await prisma.complexAvailability.create({
      data: {
        complexId: parsed.data.complexId,
        dayOfWeek: parsed.data.dayOfWeek,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        slotMinutes: parsed.data.slotMinutes,
      },
    });
    await auditLog(v.session, "ComplexAvailability", row.id, "create", parsed.data);
  } catch {
    redirect(err(pathComplex, "Could not save availability window."));
  }
  revalidatePath("/fields/complexes");
  revalidatePath(pathComplex);
  redirect(pathComplex);
}

export async function updateAvailabilityWindowAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const aid = String(formData.get("availabilityId") ?? "").trim();
  const parsed = updateAvailabilityWindowSchema.safeParse({
    availabilityId: aid,
    dayOfWeek: String(formData.get("dayOfWeek") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    slotMinutes: String(formData.get("slotMinutes") ?? "30"),
    isActive: formData.get("isActive") === "on",
  });
  const fallback = "/fields/complexes";
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    const msg =
      f.availabilityId?.[0] ??
      f.dayOfWeek?.[0] ??
      f.startTime?.[0] ??
      f.endTime?.[0] ??
      f.slotMinutes?.[0] ??
      "Invalid availability window.";
    const loc = await prisma.complexAvailability.findFirst({
      where: { id: aid },
      select: { complexId: true },
    });
    const path = loc ? complexDetailPath(loc.complexId) : fallback;
    redirect(err(path, msg));
  }
  let pathComplex = fallback;
  try {
    const row = await assertCanManageAvailabilityWindow(v, parsed.data.availabilityId);
    pathComplex = complexDetailPath(row.complexId);
  } catch {
    redirect(err(fallback, "Not authorized."));
  }
  await prisma.complexAvailability.update({
    where: { id: parsed.data.availabilityId },
    data: {
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      slotMinutes: parsed.data.slotMinutes,
      isActive: parsed.data.isActive,
    },
  });
  await auditLog(v.session, "ComplexAvailability", parsed.data.availabilityId, "update", parsed.data);
  revalidatePath("/fields/complexes");
  revalidatePath(pathComplex);
  redirect(pathComplex);
}

export async function createFieldAvailabilityWindowAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const fieldIdRaw = String(formData.get("fieldId") ?? "").trim();
  const parsed = createFieldAvailabilityWindowSchema.safeParse({
    fieldId: fieldIdRaw,
    dayOfWeek: String(formData.get("dayOfWeek") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    slotMinutes: String(formData.get("slotMinutes") ?? "30"),
  });

  const fallback = "/fields/complexes";
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    const msg =
      f.fieldId?.[0] ??
      f.dayOfWeek?.[0] ??
      f.startTime?.[0] ??
      f.endTime?.[0] ??
      f.slotMinutes?.[0] ??
      "Invalid field availability window.";
    redirect(err(fallback, msg));
  }

  let complexId: string;
  try {
    const managed = await assertCanManageField(v, parsed.data.fieldId);
    complexId = managed.complexId;
  } catch {
    redirect(err(fallback, "Not authorized."));
  }

  const complexWindows = await prisma.complexAvailability.findMany({
    where: {
      complexId,
      dayOfWeek: parsed.data.dayOfWeek,
      isActive: true,
    },
    select: { startTime: true, endTime: true },
  });
  const pathComplex = complexDetailPath(complexId);
  if (complexWindows.length === 0) {
    redirect(err(pathComplex, "Complex is closed on that day. Add complex hours first."));
  }
  if (!withinAnyWindow(parsed.data.startTime, parsed.data.endTime, complexWindows)) {
    redirect(err(pathComplex, "Field window must fit inside an active complex window."));
  }

  try {
    const row = await prisma.fieldAvailability.create({
      data: {
        fieldId: parsed.data.fieldId,
        dayOfWeek: parsed.data.dayOfWeek,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        slotMinutes: parsed.data.slotMinutes,
      },
    });
    await auditLog(v.session, "FieldAvailability", row.id, "create", parsed.data);
  } catch {
    redirect(err(pathComplex, "Could not save field availability window."));
  }
  revalidatePath("/fields/complexes");
  revalidatePath(pathComplex);
  redirect(pathComplex);
}

export async function updateFieldAvailabilityWindowAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const faid = String(formData.get("fieldAvailabilityId") ?? "").trim();
  const parsed = updateFieldAvailabilityWindowSchema.safeParse({
    fieldAvailabilityId: faid,
    dayOfWeek: String(formData.get("dayOfWeek") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    slotMinutes: String(formData.get("slotMinutes") ?? "30"),
    isActive: formData.get("isActive") === "on",
  });
  const fallback = "/fields/complexes";
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    const msg =
      f.fieldAvailabilityId?.[0] ??
      f.dayOfWeek?.[0] ??
      f.startTime?.[0] ??
      f.endTime?.[0] ??
      f.slotMinutes?.[0] ??
      "Invalid field availability window.";
    redirect(err(fallback, msg));
  }

  let fieldId: string;
  let complexId: string;
  try {
    const managed = await assertCanManageFieldAvailabilityWindow(v, parsed.data.fieldAvailabilityId);
    fieldId = managed.fieldId;
    complexId = managed.field.complexId;
  } catch {
    redirect(err(fallback, "Not authorized."));
  }
  const pathComplex = complexDetailPath(complexId);

  if (parsed.data.isActive) {
    const complexWindows = await prisma.complexAvailability.findMany({
      where: {
        complexId,
        dayOfWeek: parsed.data.dayOfWeek,
        isActive: true,
      },
      select: { startTime: true, endTime: true },
    });
    if (complexWindows.length === 0) {
      redirect(err(pathComplex, "Complex is closed on that day. Disable this field window or add complex hours."));
    }
    if (!withinAnyWindow(parsed.data.startTime, parsed.data.endTime, complexWindows)) {
      redirect(err(pathComplex, "Active field window must fit inside an active complex window."));
    }
  }

  await prisma.fieldAvailability.update({
    where: { id: parsed.data.fieldAvailabilityId },
    data: {
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      slotMinutes: parsed.data.slotMinutes,
      isActive: parsed.data.isActive,
    },
  });
  await auditLog(v.session, "FieldAvailability", parsed.data.fieldAvailabilityId, "update", {
    ...parsed.data,
    fieldId,
  });
  revalidatePath("/fields/complexes");
  revalidatePath(pathComplex);
  redirect(pathComplex);
}
