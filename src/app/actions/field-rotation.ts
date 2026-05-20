"use server";

import { revalidatePath } from "next/cache";
import type { DayOfWeek, FieldRotationCadence } from "@prisma/client";
import { auditLog } from "@/lib/audit-log";
import { addMinutesToHm } from "@/lib/fields/assignment-intervals";
import {
  datesMatchingRotationWeekdays,
  fieldIdForRotationSlot,
  rotationPhaseIndex,
  sortedRotationMembers,
  type RotationMemberSlot,
} from "@/lib/fields/field-rotation";
import { peerConflictMessage } from "@/lib/fields/field-assignment-peer-conflicts";
import { formatYmdLocal, parseYmdLocal } from "@/lib/fields/local-date";
import { prisma } from "@/lib/prisma";
import { requireFieldInfraSession } from "@/lib/server/field-infra-session";
import { canManageFieldComplexesForLocation } from "@/lib/rbac-fields";
import {
  createFieldRotationGroupSchema,
  deleteFieldRotationGroupSchema,
} from "@/lib/validation/field-rotation";

export type RotationActionResult =
  | { ok: true; groupId: string; createdCount: number; skippedCount: number }
  | { ok: false; error: string };

function isPastDateYmd(ymd: string): boolean {
  const today = formatYmdLocal(new Date());
  return ymd < today;
}

type ActiveRotationMember = RotationMemberSlot & { teamId: string };

function activeMembersOnDate(
  members: {
    slotIndex: number;
    primaryFieldId: string;
    teamId: string;
    memberEndDate: Date | null;
  }[],
  date: Date
): ActiveRotationMember[] {
  const ymd = formatYmdLocal(date);
  return members
    .filter((m) => !m.memberEndDate || formatYmdLocal(m.memberEndDate) >= ymd)
    .map((m) => ({
      slotIndex: m.slotIndex,
      primaryFieldId: m.primaryFieldId,
      teamId: m.teamId,
    }));
}

async function materializeRotationGroup(
  groupId: string,
  fromDate: Date
): Promise<{ createdCount: number; skippedCount: number }> {
  const group = await prisma.fieldRotationGroup.findFirst({
    where: { id: groupId },
    include: {
      members: true,
      complex: { select: { locationId: true } },
    },
  });
  if (!group) {
    return { createdCount: 0, skippedCount: 0 };
  }

  const locationId = group.complex.locationId;
  const fromYmd = formatYmdLocal(fromDate);
  const fromParsed = parseYmdLocal(fromYmd);
  const start =
    fromParsed > group.anchorDate ? fromParsed : parseYmdLocal(formatYmdLocal(group.anchorDate));

  await prisma.fieldAssignment.deleteMany({
    where: {
      rotationGroupId: groupId,
      assignmentDate: { gte: start },
    },
  });

  const dates = datesMatchingRotationWeekdays(
    start,
    group.recurrenceEndDate,
    group.daysOfWeek as DayOfWeek[]
  );

  const teams = await prisma.team.findMany({
    where: { id: { in: group.members.map((m) => m.teamId) } },
    select: { id: true, seasonLabel: true },
  });
  const seasonByTeam = new Map(teams.map((t) => [t.id, t.seasonLabel]));

  let createdCount = 0;
  let skippedCount = 0;

  for (const d of dates) {
    if (isPastDateYmd(formatYmdLocal(d))) continue;

    const active = activeMembersOnDate(group.members, d);
    if (active.length === 0) continue;

    const phase =
      active.length === 1
        ? 0
        : rotationPhaseIndex({
            cadence: group.cadence as FieldRotationCadence,
            anchorDate: group.anchorDate,
            assignmentDate: d,
            daysOfWeek: group.daysOfWeek as DayOfWeek[],
            memberCount: active.length,
          });

    const slots = sortedRotationMembers(active);

    const peers = await prisma.fieldAssignment.findMany({
      where: {
        assignmentDate: d,
        field: { complex: { locationId } },
      },
      select: { id: true, fieldId: true, teamId: true, startTime: true, endTime: true },
    });

    for (const member of slots) {
      const row = active.find((a) => a.slotIndex === member.slotIndex);
      if (!row) {
        skippedCount += 1;
        continue;
      }

      const fieldId =
        active.length === 1
          ? row.primaryFieldId
          : fieldIdForRotationSlot(active, member.slotIndex, phase);
      if (!fieldId) {
        skippedCount += 1;
        continue;
      }

      const teamId = row.teamId;
      if (!teamId) {
        skippedCount += 1;
        continue;
      }

      const conflict = peerConflictMessage(peers, {
        fieldId,
        teamId,
        startTime: group.startTime,
        endTime: group.endTime,
      });
      if (conflict) {
        skippedCount += 1;
        continue;
      }

      const created = await prisma.fieldAssignment.create({
        data: {
          seasonLabel: seasonByTeam.get(teamId) ?? group.seasonLabel,
          teamId,
          fieldId,
          assignmentDate: d,
          startTime: group.startTime,
          endTime: group.endTime,
          rotationGroupId: groupId,
        },
        select: { id: true, fieldId: true, teamId: true, startTime: true, endTime: true },
      });
      peers.push(created);
      createdCount += 1;
    }
  }

  return { createdCount, skippedCount };
}

export async function createFieldRotationGroupAction(
  formData: FormData
): Promise<RotationActionResult> {
  const v = await requireFieldInfraSession();
  const weekdays = formData.getAll("weekdays").map((x) => String(x));
  const memberRows: { teamId: string; primaryFieldId: string; slotIndex: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const teamId = String(formData.get(`memberTeamId_${i}`) ?? "").trim();
    const fieldId = String(formData.get(`memberFieldId_${i}`) ?? "").trim();
    if (!teamId || !fieldId) continue;
    memberRows.push({ teamId, primaryFieldId: fieldId, slotIndex: i });
  }

  const parsed = createFieldRotationGroupSchema.safeParse({
    locationId: String(formData.get("locationId") ?? ""),
    complexId: String(formData.get("complexId") ?? ""),
    cadence: String(formData.get("cadence") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    durationMinutes: String(formData.get("durationMinutes") ?? ""),
    anchorDate: String(formData.get("anchorDate") ?? ""),
    recurrenceEndDate: String(formData.get("recurrenceEndDate") ?? ""),
    weekdays,
    members: memberRows,
  });

  if (!parsed.success) {
    return { ok: false, error: "Invalid rotation settings." };
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

  if (isPastDateYmd(parsed.data.recurrenceEndDate)) {
    return { ok: false, error: "End date must be today or later." };
  }

  const endTime = addMinutesToHm(parsed.data.startTime, parsed.data.durationMinutes);
  if (!endTime) {
    return { ok: false, error: "Invalid session length." };
  }

  const teamIds = new Set(parsed.data.members.map((m) => m.teamId));
  if (teamIds.size !== parsed.data.members.length) {
    return { ok: false, error: "Each team may only appear once in a rotation." };
  }

  const teams = await prisma.team.findMany({
    where: { id: { in: [...teamIds] }, locationId: parsed.data.locationId },
    select: { id: true, seasonLabel: true },
  });
  if (teams.length !== parsed.data.members.length) {
    return { ok: false, error: "All teams must belong to this location." };
  }

  const fieldIds = new Set(parsed.data.members.map((m) => m.primaryFieldId));
  const fields = await prisma.field.findMany({
    where: {
      id: { in: [...fieldIds] },
      complexId: parsed.data.complexId,
      complex: { locationId: parsed.data.locationId },
    },
    select: { id: true },
  });
  if (fields.length !== fieldIds.size) {
    return { ok: false, error: "All fields must belong to the selected complex." };
  }

  const seasonLabel = teams[0]?.seasonLabel ?? "";

  try {
    const group = await prisma.fieldRotationGroup.create({
      data: {
        seasonLabel,
        complexId: parsed.data.complexId,
        cadence: parsed.data.cadence,
        startTime: parsed.data.startTime,
        endTime,
        daysOfWeek: parsed.data.weekdays,
        anchorDate: parseYmdLocal(parsed.data.anchorDate),
        recurrenceEndDate: parseYmdLocal(parsed.data.recurrenceEndDate),
        members: {
          create: parsed.data.members.map((m) => ({
            teamId: m.teamId,
            slotIndex: m.slotIndex,
            primaryFieldId: m.primaryFieldId,
          })),
        },
      },
      select: { id: true, anchorDate: true },
    });

    const { createdCount, skippedCount } = await materializeRotationGroup(
      group.id,
      group.anchorDate
    );

    await auditLog(v.session, "FieldRotationGroup", group.id, "create", {
      memberCount: parsed.data.members.length,
      createdCount,
      skippedCount,
    });

    revalidatePath("/fields/schedule");
    revalidatePath("/fields/dashboard");
    return { ok: true, groupId: group.id, createdCount, skippedCount };
  } catch {
    return { ok: false, error: "Could not create rotation group." };
  }
}

export async function deleteFieldRotationGroupAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await requireFieldInfraSession();
  const parsed = deleteFieldRotationGroupSchema.safeParse({
    locationId: String(formData.get("locationId") ?? ""),
    groupId: String(formData.get("groupId") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid request." };
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

  const group = await prisma.fieldRotationGroup.findFirst({
    where: {
      id: parsed.data.groupId,
      complex: { locationId: parsed.data.locationId },
    },
    select: { id: true },
  });
  if (!group) {
    return { ok: false, error: "Rotation not found." };
  }

  await prisma.fieldAssignment.deleteMany({ where: { rotationGroupId: group.id } });
  await prisma.fieldRotationGroup.delete({ where: { id: group.id } });
  await auditLog(v.session, "FieldRotationGroup", group.id, "delete", {});
  revalidatePath("/fields/schedule");
  revalidatePath("/fields/dashboard");
  return { ok: true };
}

export async function rematerializeFieldRotationGroupAction(
  formData: FormData
): Promise<RotationActionResult> {
  const v = await requireFieldInfraSession();
  const parsed = deleteFieldRotationGroupSchema.safeParse({
    locationId: String(formData.get("locationId") ?? ""),
    groupId: String(formData.get("groupId") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid request." };
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

  const group = await prisma.fieldRotationGroup.findFirst({
    where: {
      id: parsed.data.groupId,
      complex: { locationId: parsed.data.locationId },
    },
    select: { id: true, anchorDate: true },
  });
  if (!group) {
    return { ok: false, error: "Rotation not found." };
  }

  const from = isPastDateYmd(formatYmdLocal(new Date()))
    ? parseYmdLocal(formatYmdLocal(new Date()))
    : group.anchorDate;

  const { createdCount, skippedCount } = await materializeRotationGroup(group.id, from);
  revalidatePath("/fields/schedule");
  revalidatePath("/fields/dashboard");
  return { ok: true, groupId: group.id, createdCount, skippedCount };
}
