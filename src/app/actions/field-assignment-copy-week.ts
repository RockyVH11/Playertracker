"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditLog } from "@/lib/audit-log";
import {
  destDateForCopiedAssignment,
  sameWeek,
  weekStartFromAnchor,
} from "@/lib/fields/copy-week-map";
import { validateCloneBatch } from "@/lib/fields/copy-week-validate";
import { addDaysLocal, formatYmdLocal, parseYmdLocal } from "@/lib/fields/local-date";
import { prisma } from "@/lib/prisma";
import { canManageFieldComplexesForLocation } from "@/lib/rbac-fields";
import {
  fieldInfraErr,
  requireFieldInfraSession,
} from "@/lib/server/field-infra-session";
import { copyFieldWeekSchema } from "@/lib/validation/field-assignment-copy-week";

const err = fieldInfraErr;

function scheduleHref(locationId: string | undefined, dateYmd: string) {
  if (locationId) {
    return `/fields/schedule?locationId=${encodeURIComponent(locationId)}&date=${encodeURIComponent(dateYmd)}`;
  }
  return `/fields/schedule?date=${encodeURIComponent(dateYmd)}`;
}

export async function copyFieldWeekAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const parsed = copyFieldWeekSchema.safeParse({
    locationId: String(formData.get("locationId") ?? ""),
    sourceWeekAnchor: String(formData.get("sourceWeekAnchor") ?? ""),
    destWeekAnchor: String(formData.get("destWeekAnchor") ?? ""),
  });
  const locHint = String(formData.get("locationId") ?? "").trim();
  const destHint = String(formData.get("destWeekAnchor") ?? "").trim();
  const fallback = scheduleHref(locHint || undefined, destHint || formatYmdLocal(new Date()));

  if (!parsed.success) {
    redirect(err(fallback, "Invalid week copy request."));
  }

  const locationId = parsed.data.locationId;
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

  const sourceWs = weekStartFromAnchor(parsed.data.sourceWeekAnchor);
  const destWs = weekStartFromAnchor(parsed.data.destWeekAnchor);
  if (!sourceWs || !destWs) {
    redirect(err(fallback, "Invalid dates."));
  }

  if (sameWeek(sourceWs, destWs)) {
    redirect(err(fallback, "Source and destination must be different weeks."));
  }

  const sourceEnd = addDaysLocal(sourceWs, 6);

  const sources = await prisma.fieldAssignment.findMany({
    where: {
      assignmentDate: { gte: sourceWs, lte: sourceEnd },
      field: { complex: { locationId } },
    },
    select: {
      seasonLabel: true,
      teamId: true,
      fieldId: true,
      assignmentDate: true,
      startTime: true,
      endTime: true,
      notes: true,
    },
  });

  if (sources.length === 0) {
    redirect(err(fallback, "No assignments in the source week to copy."));
  }

  const destStart = destWs;
  const destEnd = addDaysLocal(destWs, 6);

  const existingDest = await prisma.fieldAssignment.findMany({
    where: {
      assignmentDate: { gte: destStart, lte: destEnd },
      field: { complex: { locationId } },
    },
    select: {
      id: true,
      fieldId: true,
      teamId: true,
      assignmentDate: true,
      startTime: true,
      endTime: true,
    },
  });

  type Planned = {
    destYmd: string;
    fieldId: string;
    teamId: string;
    startTime: string;
    endTime: string;
    seasonLabel: string;
    notes: string | null;
  };

  const planned: Planned[] = sources.map((s) => {
    const destDate = destDateForCopiedAssignment(sourceWs, destWs, s.assignmentDate);
    const destYmd = formatYmdLocal(destDate);
    return {
      destYmd,
      fieldId: s.fieldId,
      teamId: s.teamId,
      startTime: s.startTime,
      endTime: s.endTime,
      seasonLabel: s.seasonLabel,
      notes: s.notes ?? null,
    };
  });

  const byDay = new Map<string, Planned[]>();
  for (const p of planned) {
    const list = byDay.get(p.destYmd) ?? [];
    list.push(p);
    byDay.set(p.destYmd, list);
  }

  for (const [ymd, list] of byDay) {
    const existingPeers = existingDest
      .filter((e) => formatYmdLocal(e.assignmentDate) === ymd)
      .map((e) => ({
        id: e.id,
        fieldId: e.fieldId,
        teamId: e.teamId,
        startTime: e.startTime,
        endTime: e.endTime,
      }));
    const slices = list.map((p) => ({
      fieldId: p.fieldId,
      teamId: p.teamId,
      startTime: p.startTime,
      endTime: p.endTime,
    }));
    const msg = validateCloneBatch(existingPeers, slices);
    if (msg) {
      redirect(err(fallback, `${ymd}: ${msg}`));
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
    redirect(err(fallback, "Could not copy week (try again)."));
  }

  for (let i = 0; i < createdIds.length; i++) {
    const id = createdIds[i]!.id;
    const p = planned[i]!;
    await auditLog(v.session, "FieldAssignment", id, "create", {
      fieldId: p.fieldId,
      teamId: p.teamId,
      destYmd: p.destYmd,
    });
  }

  revalidatePath("/fields/schedule");
  revalidatePath("/fields/dashboard");
  redirect(scheduleHref(locationId, parsed.data.destWeekAnchor));
}
