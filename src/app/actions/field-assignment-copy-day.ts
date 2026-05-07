"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditLog } from "@/lib/audit-log";
import { validateCloneBatch } from "@/lib/fields/copy-week-validate";
import { addDaysLocal, formatYmdLocal, parseYmdLocal } from "@/lib/fields/local-date";
import { prisma } from "@/lib/prisma";
import { canManageFieldComplexesForLocation } from "@/lib/rbac-fields";
import { fieldInfraErr, requireFieldInfraSession } from "@/lib/server/field-infra-session";
import { copyComplexDaySchema } from "@/lib/validation/field-assignment-copy-day";

const err = fieldInfraErr;

function scheduleHref(locationId: string | undefined, dateYmd: string, notice?: string) {
  const base =
    locationId != null
      ? `/fields/schedule?locationId=${encodeURIComponent(locationId)}&date=${encodeURIComponent(dateYmd)}`
      : `/fields/schedule?date=${encodeURIComponent(dateYmd)}`;
  if (!notice) return base;
  return `${base}&notice=${encodeURIComponent(notice)}`;
}

/** Sundays-week: same weekday each week from `firstDest` through `endInclusive`. */
function weeklyDatesFromThrough(firstDest: Date, endInclusive: Date): Date[] {
  const out: Date[] = [];
  let d = firstDest;
  while (d <= endInclusive) {
    out.push(d);
    d = addDaysLocal(d, 7);
  }
  return out;
}

export async function copyComplexDayAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const recurrenceRaw = String(formData.get("recurrenceEndDate") ?? "").trim();
  const parsed = copyComplexDaySchema.safeParse({
    locationId: String(formData.get("locationId") ?? ""),
    complexId: String(formData.get("complexId") ?? ""),
    sourceDate: String(formData.get("sourceDate") ?? ""),
    destDate: String(formData.get("destDate") ?? ""),
    recurrenceEndDate: recurrenceRaw,
  });

  const locHint = String(formData.get("locationId") ?? "").trim();
  const dateHint = String(formData.get("destDate") ?? "").trim();
  const fallback = scheduleHref(locHint || undefined, dateHint || formatYmdLocal(new Date()));

  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    const first =
      msg.locationId?.[0] ??
      msg.complexId?.[0] ??
      msg.sourceDate?.[0] ??
      msg.destDate?.[0] ??
      msg.recurrenceEndDate?.[0] ??
      "Invalid copy request.";
    redirect(err(fallback, first));
  }

  const { locationId, complexId, sourceDate, destDate, recurrenceEndDate } = parsed.data;

  if (
    !canManageFieldComplexesForLocation(
      v.session,
      v.viewerStaffRole,
      v.primaryLocationId,
      locationId
    )
  ) {
    redirect(err(fallback, "Not authorized."));
  }

  const complexOk = await prisma.complex.findFirst({
    where: { id: complexId, locationId, isActive: true },
    select: { id: true },
  });
  if (!complexOk) {
    redirect(err(fallback, "Complex not found for this location."));
  }

  const sourceD = parseYmdLocal(sourceDate);
  const destFirst = parseYmdLocal(destDate);

  let destDates: Date[];
  if (recurrenceEndDate) {
    const endD = parseYmdLocal(recurrenceEndDate);
    destDates = weeklyDatesFromThrough(destFirst, endD);
  } else {
    if (formatYmdLocal(sourceD) === formatYmdLocal(destFirst)) {
      redirect(err(fallback, "Destination date must differ from source date."));
    }
    destDates = [destFirst];
  }

  const sources = await prisma.fieldAssignment.findMany({
    where: {
      assignmentDate: sourceD,
      field: { complexId },
    },
    select: {
      seasonLabel: true,
      teamId: true,
      fieldId: true,
      startTime: true,
      endTime: true,
      notes: true,
    },
  });

  if (sources.length === 0) {
    redirect(err(fallback, "No assignments for that complex on the source date."));
  }

  type Planned = {
    destYmd: string;
    seasonLabel: string;
    teamId: string;
    fieldId: string;
    startTime: string;
    endTime: string;
    notes: string | null;
  };

  const planned: Planned[] = [];
  for (const target of destDates) {
    const destYmd = formatYmdLocal(target);
    if (destYmd === formatYmdLocal(sourceD)) {
      redirect(
        err(fallback, "Destination dates must not include the source date (no same-day copy).")
      );
    }
    for (const s of sources) {
      planned.push({
        destYmd,
        seasonLabel: s.seasonLabel,
        teamId: s.teamId,
        fieldId: s.fieldId,
        startTime: s.startTime,
        endTime: s.endTime,
        notes: s.notes ?? null,
      });
    }
  }

  const uniqueYmids = [...new Set(planned.map((p) => p.destYmd))];

  const existingByYmd = new Map<
    string,
    { id: string; fieldId: string; teamId: string; startTime: string; endTime: string }[]
  >();

  for (const ymd of uniqueYmids) {
    const existing = await prisma.fieldAssignment.findMany({
      where: {
        assignmentDate: parseYmdLocal(ymd),
        field: { complex: { locationId } },
      },
      select: {
        id: true,
        fieldId: true,
        teamId: true,
        startTime: true,
        endTime: true,
      },
    });
    existingByYmd.set(ymd, existing);
  }

  for (const ymd of uniqueYmids) {
    const peers = existingByYmd.get(ymd) ?? [];
    const slices = planned
      .filter((p) => p.destYmd === ymd)
      .map((p) => ({
        fieldId: p.fieldId,
        teamId: p.teamId,
        startTime: p.startTime,
        endTime: p.endTime,
      }));
    const conflictMsg = validateCloneBatch(peers, slices);
    if (conflictMsg) {
      redirect(err(fallback, `${ymd}: ${conflictMsg}`));
    }
  }

  let createdIds: { id: string }[];
  try {
    createdIds = await prisma.$transaction(
      planned.map((p) =>
        prisma.fieldAssignment.create({
          data: {
            seasonLabel: p.seasonLabel,
            teamId: p.teamId,
            fieldId: p.fieldId,
            assignmentDate: parseYmdLocal(p.destYmd),
            startTime: p.startTime,
            endTime: p.endTime,
            notes: p.notes,
            recurrenceGroupId: null,
            sourceRequestId: null,
          },
          select: { id: true },
        })
      )
    );
  } catch {
    redirect(err(fallback, "Could not copy day (try again)."));
  }

  for (let i = 0; i < createdIds.length; i++) {
    const id = createdIds[i]!.id;
    const p = planned[i]!;
    await auditLog(v.session, "FieldAssignment", id, "create", {
      source: "copy_complex_day",
      complexId,
      sourceDate,
      destYmd: p.destYmd,
      fieldId: p.fieldId,
      teamId: p.teamId,
    });
  }

  revalidatePath("/fields/schedule");
  revalidatePath("/fields/dashboard");

  const notice = `Copied ${planned.length} session(s) across ${uniqueYmids.length} date(s).`;
  redirect(scheduleHref(locationId, parsed.data.destDate, notice));
}
