"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DayOfWeek } from "@prisma/client";
import { auditLog } from "@/lib/audit-log";
import { addMinutesToHm } from "@/lib/fields/assignment-intervals";
import { dayOfWeekFromDate } from "@/lib/fields/day-of-week-from-date";
import { peerConflictMessage } from "@/lib/fields/field-assignment-peer-conflicts";
import { addDaysLocal, formatYmdLocal, parseYmdLocal } from "@/lib/fields/local-date";
import { prisma } from "@/lib/prisma";
import {
  assertCanManageField,
  fieldInfraErr,
  requireFieldInfraSession,
} from "@/lib/server/field-infra-session";
import { canManageFieldComplexesForLocation } from "@/lib/rbac-fields";
import {
  createFieldAssignmentFromWizardDropSchema,
  createRecurringFieldAssignmentsSchema,
  createFieldAssignmentSchema,
  deleteFieldAssignmentSchema,
  moveFieldAssignmentFromWizardDragSchema,
  wizardDeleteFieldAssignmentSchema,
} from "@/lib/validation/field-assignment";

export type WizardDropResult =
  | { ok: true; assignmentId: string }
  | { ok: false; error: string };

export type WizardRecurrenceResult =
  | { ok: true; createdCount: number; skippedCount: number }
  | { ok: false; error: string };

export type WizardDeleteResult =
  | { ok: true; deletedCount: number }
  | { ok: false; error: string };

export type WizardMoveResult = { ok: true } | { ok: false; error: string };

const err = fieldInfraErr;

function scheduleHref(locationId: string | undefined, dateYmd: string) {
  if (locationId) {
    return `/fields/schedule?locationId=${encodeURIComponent(locationId)}&date=${encodeURIComponent(dateYmd)}`;
  }
  return `/fields/schedule?date=${encodeURIComponent(dateYmd)}`;
}

function isPastDateYmd(ymd: string): boolean {
  const today = formatYmdLocal(new Date());
  return ymd < today;
}

function enumDayFromDate(d: Date): DayOfWeek {
  return dayOfWeekFromDate(d);
}

export async function createFieldAssignmentAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const rawSource = String(formData.get("sourceRequestId") ?? "").trim();
  const parsed = createFieldAssignmentSchema.safeParse({
    fieldId: String(formData.get("fieldId") ?? ""),
    teamId: String(formData.get("teamId") ?? ""),
    assignmentDate: String(formData.get("assignmentDate") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    sourceRequestId: rawSource.length ? rawSource : "",
  });
  const dateStr = String(formData.get("assignmentDate") ?? "");
  const locHint = String(formData.get("locationId") ?? "").trim();
  const fallback = scheduleHref(locHint || undefined, dateStr || formatYmdLocal(new Date()));

  if (!parsed.success) {
    redirect(err(fallback, "Invalid assignment."));
  }

  const fieldRow = await prisma.field.findFirst({
    where: { id: parsed.data.fieldId },
    include: { complex: { select: { locationId: true } } },
  });
  if (!fieldRow?.complex) {
    redirect(err(fallback, "Field not found."));
  }
  const locationId = fieldRow.complex.locationId;
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

  const team = await prisma.team.findFirst({
    where: { id: parsed.data.teamId },
    select: { id: true, seasonLabel: true, locationId: true },
  });
  if (!team || team.locationId !== locationId) {
    redirect(err(fallback, "Team must belong to this location."));
  }

  if (parsed.data.sourceRequestId) {
    const fr = await prisma.fieldRequest.findFirst({
      where: { id: parsed.data.sourceRequestId },
      select: { teamId: true },
    });
    if (!fr || fr.teamId !== team.id) {
      redirect(err(fallback, "Field request does not match team."));
    }
  }

  const assignmentDate = parseYmdLocal(parsed.data.assignmentDate);

  const peers = await prisma.fieldAssignment.findMany({
    where: {
      assignmentDate,
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

  const conflict = peerConflictMessage(peers, {
    fieldId: parsed.data.fieldId,
    teamId: parsed.data.teamId,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
  });
  if (conflict) {
    redirect(err(fallback, conflict));
  }

  try {
    const row = await prisma.fieldAssignment.create({
      data: {
        seasonLabel: team.seasonLabel,
        teamId: team.id,
        fieldId: parsed.data.fieldId,
        assignmentDate,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        notes: parsed.data.notes ?? null,
        sourceRequestId: parsed.data.sourceRequestId ?? null,
      },
    });
    await auditLog(v.session, "FieldAssignment", row.id, "create", {
      fieldId: row.fieldId,
      teamId: row.teamId,
    });
  } catch {
    redirect(err(fallback, "Could not create assignment."));
  }

  revalidatePath("/fields/schedule");
  redirect(scheduleHref(locationId, parsed.data.assignmentDate));
}

export async function deleteFieldAssignmentAction(formData: FormData) {
  const v = await requireFieldInfraSession();
  const parsed = deleteFieldAssignmentSchema.safeParse({
    assignmentId: String(formData.get("assignmentId") ?? ""),
  });
  const dateFallback = formatYmdLocal(new Date());
  if (!parsed.success) {
    redirect(err(scheduleHref(undefined, dateFallback), "Invalid assignment."));
  }

  const existing = await prisma.fieldAssignment.findFirst({
    where: { id: parsed.data.assignmentId },
    include: {
      field: { include: { complex: { select: { locationId: true } } } },
    },
  });
  if (!existing) {
    redirect(err(scheduleHref(undefined, dateFallback), "Assignment not found."));
  }

  const locationId = existing.field.complex.locationId;
  try {
    await assertCanManageField(v, existing.fieldId);
  } catch {
    redirect(err(scheduleHref(locationId, formatYmdLocal(existing.assignmentDate)), "Not authorized."));
  }

  await prisma.fieldAssignment.delete({ where: { id: parsed.data.assignmentId } });
  await auditLog(v.session, "FieldAssignment", parsed.data.assignmentId, "delete", {});
  revalidatePath("/fields/schedule");
  redirect(scheduleHref(locationId, formatYmdLocal(existing.assignmentDate)));
}

export async function createFieldAssignmentFromWizardDropAction(
  formData: FormData
): Promise<WizardDropResult> {
  const v = await requireFieldInfraSession();
  const parsed = createFieldAssignmentFromWizardDropSchema.safeParse({
    locationId: String(formData.get("locationId") ?? ""),
    complexId: String(formData.get("complexId") ?? ""),
    teamId: String(formData.get("teamId") ?? ""),
    fieldId: String(formData.get("fieldId") ?? ""),
    assignmentDate: String(formData.get("assignmentDate") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    windowStart: String(formData.get("windowStart") ?? ""),
    durationMinutes: String(formData.get("durationMinutes") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid wizard assignment." };
  }
  if (isPastDateYmd(parsed.data.assignmentDate)) {
    return { ok: false, error: "Past dates are not allowed." };
  }

  if (
    !canManageFieldComplexesForLocation(
      v.session,
      v.viewerStaffRole,
      v.primaryLocationId,
      parsed.data.locationId
    )
  ) {
    return { ok: false, error: "Not authorized." };
  }

  const fieldRow = await prisma.field.findFirst({
    where: { id: parsed.data.fieldId, complex: { locationId: parsed.data.locationId } },
    select: { id: true },
  });
  if (!fieldRow) {
    return { ok: false, error: "Field not found for location." };
  }

  const team = await prisma.team.findFirst({
    where: { id: parsed.data.teamId, locationId: parsed.data.locationId },
    select: { id: true, seasonLabel: true },
  });
  if (!team) {
    return { ok: false, error: "Team must belong to this location." };
  }

  const endTime = addMinutesToHm(parsed.data.startTime, parsed.data.durationMinutes);
  if (!endTime) {
    return { ok: false, error: "Invalid session length." };
  }

  const assignmentDate = parseYmdLocal(parsed.data.assignmentDate);
  const peers = await prisma.fieldAssignment.findMany({
    where: {
      assignmentDate,
      field: { complex: { locationId: parsed.data.locationId } },
    },
    select: { id: true, fieldId: true, teamId: true, startTime: true, endTime: true },
  });
  const conflict = peerConflictMessage(peers, {
    fieldId: parsed.data.fieldId,
    teamId: parsed.data.teamId,
    startTime: parsed.data.startTime,
    endTime,
  });
  if (conflict) {
    return { ok: false, error: conflict };
  }

  try {
    const created = await prisma.fieldAssignment.create({
      data: {
        seasonLabel: team.seasonLabel,
        teamId: team.id,
        fieldId: parsed.data.fieldId,
        assignmentDate,
        startTime: parsed.data.startTime,
        endTime,
      },
      select: { id: true },
    });
    await auditLog(v.session, "FieldAssignment", created.id, "create", {
      source: "wizard_drop",
    });
    revalidatePath("/fields/schedule");
    revalidatePath("/fields/dashboard");
    return { ok: true, assignmentId: created.id };
  } catch {
    return { ok: false, error: "Could not create assignment." };
  }
}

export async function createRecurringFieldAssignmentsAction(
  formData: FormData
): Promise<WizardRecurrenceResult> {
  const v = await requireFieldInfraSession();
  const weekdays = formData.getAll("weekdays").map((v) => String(v));
  const parsed = createRecurringFieldAssignmentsSchema.safeParse({
    locationId: String(formData.get("locationId") ?? ""),
    complexId: String(formData.get("complexId") ?? ""),
    assignmentId: String(formData.get("assignmentId") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    windowStart: String(formData.get("windowStart") ?? ""),
    durationMinutes: String(formData.get("durationMinutes") ?? ""),
    weekdays,
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid recurrence options." };
  }
  if (isPastDateYmd(parsed.data.endDate)) {
    return { ok: false, error: "End date must be today or later." };
  }
  if (
    !canManageFieldComplexesForLocation(
      v.session,
      v.viewerStaffRole,
      v.primaryLocationId,
      parsed.data.locationId
    )
  ) {
    return { ok: false, error: "Not authorized." };
  }

  const base = await prisma.fieldAssignment.findFirst({
    where: {
      id: parsed.data.assignmentId,
      field: { complex: { locationId: parsed.data.locationId } },
    },
    select: {
      id: true,
      teamId: true,
      fieldId: true,
      seasonLabel: true,
      assignmentDate: true,
      startTime: true,
      endTime: true,
      notes: true,
      recurrenceGroupId: true,
    },
  });
  if (!base) {
    return { ok: false, error: "Base assignment not found." };
  }

  const startDate = addDaysLocal(base.assignmentDate, 1);
  const endDate = parseYmdLocal(parsed.data.endDate);
  if (Number.isNaN(endDate.getTime()) || endDate < base.assignmentDate) {
    return { ok: false, error: "End date must be on or after the scheduled date." };
  }

  let cursor = startDate;
  const targetDays = new Set(parsed.data.weekdays);
  const dates: Date[] = [];
  while (cursor <= endDate) {
    if (targetDays.has(enumDayFromDate(cursor))) {
      dates.push(new Date(cursor));
    }
    cursor = addDaysLocal(cursor, 1);
  }
  if (dates.length === 0) {
    return { ok: false, error: "No dates matched selected weekdays." };
  }

  const recurrenceGroupId = base.recurrenceGroupId ?? randomUUID();
  await prisma.fieldAssignment.update({
    where: { id: base.id },
    data: { recurrenceGroupId },
  });

  const peersByYmd = new Map<string, Awaited<ReturnType<typeof prisma.fieldAssignment.findMany>>>();
  const existing = await prisma.fieldAssignment.findMany({
    where: {
      assignmentDate: { gte: startDate, lte: endDate },
      field: { complex: { locationId: parsed.data.locationId } },
    },
    select: { id: true, fieldId: true, teamId: true, assignmentDate: true, startTime: true, endTime: true },
  });
  for (const row of existing) {
    const ymd = formatYmdLocal(row.assignmentDate);
    const list = peersByYmd.get(ymd) ?? [];
    list.push(row);
    peersByYmd.set(ymd, list);
  }

  let createdCount = 0;
  let skippedCount = 0;
  for (const d of dates) {
    const ymd = formatYmdLocal(d);
    const peers = (peersByYmd.get(ymd) ?? []).map((p) => ({
      id: p.id,
      fieldId: p.fieldId,
      teamId: p.teamId,
      startTime: p.startTime,
      endTime: p.endTime,
    }));
    const conflict = peerConflictMessage(peers, {
      fieldId: base.fieldId,
      teamId: base.teamId,
      startTime: base.startTime,
      endTime: base.endTime,
    });
    if (conflict) {
      skippedCount += 1;
      continue;
    }
    const created = await prisma.fieldAssignment.create({
      data: {
        seasonLabel: base.seasonLabel,
        teamId: base.teamId,
        fieldId: base.fieldId,
        assignmentDate: d,
        startTime: base.startTime,
        endTime: base.endTime,
        notes: base.notes,
        recurrenceGroupId,
      },
      select: { id: true, fieldId: true, teamId: true, startTime: true, endTime: true },
    });
    await auditLog(v.session, "FieldAssignment", created.id, "create", {
      source: "wizard_recurrence",
      baseAssignmentId: base.id,
      recurrenceGroupId,
    });
    const nextPeers = peersByYmd.get(ymd) ?? [];
    nextPeers.push({ ...created, assignmentDate: d });
    peersByYmd.set(ymd, nextPeers);
    createdCount += 1;
  }

  revalidatePath("/fields/schedule");
  revalidatePath("/fields/dashboard");
  return { ok: true, createdCount, skippedCount };
}

export async function wizardDeleteFieldAssignmentAction(
  formData: FormData
): Promise<WizardDeleteResult> {
  const v = await requireFieldInfraSession();
  const parsed = wizardDeleteFieldAssignmentSchema.safeParse({
    assignmentId: String(formData.get("assignmentId") ?? ""),
    scope: String(formData.get("scope") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid delete request." };
  }

  const existing = await prisma.fieldAssignment.findFirst({
    where: { id: parsed.data.assignmentId },
    include: {
      field: { include: { complex: { select: { locationId: true } } } },
    },
  });
  if (!existing) {
    return { ok: false, error: "Assignment not found." };
  }

  try {
    await assertCanManageField(v, existing.fieldId);
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  if (parsed.data.scope === "this") {
    await prisma.fieldAssignment.delete({ where: { id: parsed.data.assignmentId } });
    await auditLog(v.session, "FieldAssignment", parsed.data.assignmentId, "delete", {
      scope: "this",
    });
    revalidatePath("/fields/schedule");
    revalidatePath("/fields/dashboard");
    return { ok: true, deletedCount: 1 };
  }

  const gid = existing.recurrenceGroupId;
  if (!gid) {
    return {
      ok: false,
      error: "This session is not part of a recurring group. Delete this session only.",
    };
  }

  const del = await prisma.fieldAssignment.deleteMany({ where: { recurrenceGroupId: gid } });
  await auditLog(v.session, "FieldAssignment", parsed.data.assignmentId, "delete", {
    scope: "series",
    recurrenceGroupId: gid,
    deletedCount: del.count,
  });
  revalidatePath("/fields/schedule");
  revalidatePath("/fields/dashboard");
  return { ok: true, deletedCount: del.count };
}

export async function moveFieldAssignmentFromWizardDragAction(
  formData: FormData
): Promise<WizardMoveResult> {
  const v = await requireFieldInfraSession();
  const parsed = moveFieldAssignmentFromWizardDragSchema.safeParse({
    locationId: String(formData.get("locationId") ?? ""),
    assignmentId: String(formData.get("assignmentId") ?? ""),
    fieldId: String(formData.get("fieldId") ?? ""),
    assignmentDate: String(formData.get("assignmentDate") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid move request." };
  }
  if (isPastDateYmd(parsed.data.assignmentDate)) {
    return { ok: false, error: "Past dates are not allowed." };
  }

  if (
    !canManageFieldComplexesForLocation(
      v.session,
      v.viewerStaffRole,
      v.primaryLocationId,
      parsed.data.locationId
    )
  ) {
    return { ok: false, error: "Not authorized." };
  }

  const existing = await prisma.fieldAssignment.findFirst({
    where: {
      id: parsed.data.assignmentId,
      assignmentDate: parseYmdLocal(parsed.data.assignmentDate),
      field: { complex: { locationId: parsed.data.locationId } },
    },
    select: {
      id: true,
      teamId: true,
      startTime: true,
      endTime: true,
      fieldId: true,
    },
  });
  if (!existing) {
    return { ok: false, error: "Session not found for this date." };
  }

  const fieldRow = await prisma.field.findFirst({
    where: { id: parsed.data.fieldId, complex: { locationId: parsed.data.locationId } },
    select: { id: true },
  });
  if (!fieldRow) {
    return { ok: false, error: "Target field not found for location." };
  }

  const currentLen =
    Number(existing.endTime.slice(0, 2)) * 60 +
    Number(existing.endTime.slice(3, 5)) -
    (Number(existing.startTime.slice(0, 2)) * 60 + Number(existing.startTime.slice(3, 5)));
  const nextEnd = addMinutesToHm(parsed.data.startTime, currentLen);
  if (!nextEnd) {
    return { ok: false, error: "Could not calculate new end time." };
  }

  const assignmentDate = parseYmdLocal(parsed.data.assignmentDate);
  const peers = await prisma.fieldAssignment.findMany({
    where: {
      assignmentDate,
      field: { complex: { locationId: parsed.data.locationId } },
      NOT: { id: existing.id },
    },
    select: { id: true, fieldId: true, teamId: true, startTime: true, endTime: true },
  });
  const conflict = peerConflictMessage(peers, {
    fieldId: parsed.data.fieldId,
    teamId: existing.teamId,
    startTime: parsed.data.startTime,
    endTime: nextEnd,
  });
  if (conflict) {
    return { ok: false, error: conflict };
  }

  await prisma.fieldAssignment.update({
    where: { id: existing.id },
    data: {
      fieldId: parsed.data.fieldId,
      startTime: parsed.data.startTime,
      endTime: nextEnd,
    },
  });
  await auditLog(v.session, "FieldAssignment", existing.id, "move", {
    source: "wizard_drag_move",
    fromFieldId: existing.fieldId,
    fromStartTime: existing.startTime,
    fromEndTime: existing.endTime,
    toFieldId: parsed.data.fieldId,
    toStartTime: parsed.data.startTime,
    toEndTime: nextEnd,
  });
  revalidatePath("/fields/schedule");
  revalidatePath("/fields/dashboard");
  return { ok: true };
}
