"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EquipmentReservationStatus } from "@prisma/client";
import { auditLog } from "@/lib/audit-log";
import { isReservationDateInCurrentLocalWeek } from "@/lib/equipment/coach-reservation-policy";
import { formatYmdLocal, parseYmdLocal } from "@/lib/fields/local-date";
import { prisma } from "@/lib/prisma";
import {
  canManageFieldComplexesForLocation,
  mayAccessFieldInfrastructureAdmin,
} from "@/lib/rbac-fields";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { fieldInfraErr } from "@/lib/server/field-infra-session";
import { reservationTimeOverlapsExisting } from "@/lib/equipment/reservation-overlap";
import {
  cancelEquipmentReservationSchema,
  createEquipmentReservationSchema,
  wizardEquipmentDropOnAssignmentSchema,
} from "@/lib/validation/equipment";

const err = fieldInfraErr;

function equipmentHref(locationId: string | undefined, extra?: Record<string, string>) {
  const q = new URLSearchParams();
  if (locationId) q.set("locationId", locationId);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) q.set(k, v);
  }
  const qs = q.toString();
  return qs ? `/fields/equipment?${qs}` : "/fields/equipment";
}

export async function createEquipmentReservationAction(formData: FormData) {
  const parsed = createEquipmentReservationSchema.safeParse({
    equipmentItemId: String(formData.get("equipmentItemId") ?? ""),
    teamId: String(formData.get("teamId") ?? ""),
    reservationDate: String(formData.get("reservationDate") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    quantity: String(formData.get("quantity") ?? "1"),
    linkedFieldAssignmentId: String(formData.get("linkedFieldAssignmentId") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  const locHint = String(formData.get("locationId") ?? "").trim();
  const fallback = equipmentHref(locHint || undefined);

  if (!parsed.success) {
    redirect(err(fallback, "Check equipment, team, date, and times."));
  }

  const session = await getSession();
  if (!session) redirect("/login");

  let staffRole: import("@prisma/client").StaffRole | null = null;
  let primaryLocationId: string | null = null;
  if (session.role !== "SUPER_ADMIN" && isCoachSession(session)) {
    const row = await prisma.coach.findFirst({
      where: { id: session.coachId, isActive: true },
      select: { staffRole: true, primaryLocationId: true },
    });
    staffRole = row?.staffRole ?? null;
    primaryLocationId = row?.primaryLocationId ?? null;
  }

  const bypassCoachRules =
    session.role === "SUPER_ADMIN" ||
    mayAccessFieldInfrastructureAdmin(session, staffRole);

  if (!bypassCoachRules && !isCoachSession(session)) {
    redirect(err(fallback, "Sign in as staff to reserve equipment."));
  }

  const item = await prisma.equipmentItem.findFirst({
    where: { id: parsed.data.equipmentItemId, isActive: true },
    select: { id: true, locationId: true, name: true, concurrentCapacity: true },
  });
  if (!item) {
    redirect(err(fallback, "Equipment not found or inactive."));
  }

  const team = await prisma.team.findFirst({
    where: { id: parsed.data.teamId },
    select: { id: true, coachId: true, locationId: true, seasonLabel: true },
  });
  if (!team || team.locationId !== item.locationId) {
    redirect(err(fallback, "Team must belong to this equipment’s location."));
  }

  if (bypassCoachRules) {
    if (
      !canManageFieldComplexesForLocation(
        session,
        staffRole,
        primaryLocationId,
        item.locationId
      )
    ) {
      redirect(err(fallback, "Not authorized for this location."));
    }
  } else if (!isCoachSession(session)) {
    redirect(err(fallback, "Not authorized."));
  } else if (team.coachId !== session.coachId) {
    redirect(err(fallback, "Pick one of your teams."));
  }

  const reservationDay = parseYmdLocal(parsed.data.reservationDate);
  if (!bypassCoachRules) {
    if (!isReservationDateInCurrentLocalWeek(new Date(), reservationDay)) {
      redirect(
        err(
          fallback,
          "Reservations must fall in the current calendar week (Sunday–Saturday). Directors can book any week."
        )
      );
    }
  }

  if (parsed.data.quantity > item.concurrentCapacity) {
    redirect(
      err(
        fallback,
        `You can reserve at most ${item.concurrentCapacity} unit(s) of this equipment in one booking (pool size).`
      )
    );
  }

  const linkedId: string | null = parsed.data.linkedFieldAssignmentId ?? null;
  if (linkedId) {
    const fa = await prisma.fieldAssignment.findFirst({
      where: {
        id: linkedId,
        teamId: team.id,
        field: { complex: { locationId: item.locationId } },
      },
      select: { assignmentDate: true },
    });
    if (!fa) {
      redirect(err(fallback, "Linked field session must match this team and location."));
    }
    if (formatYmdLocal(fa.assignmentDate) !== parsed.data.reservationDate) {
      redirect(err(fallback, "Linked session must be on the same calendar date."));
    }
  }

  const existingTimes = await prisma.equipmentReservation.findMany({
    where: {
      equipmentItemId: item.id,
      reservationDate: reservationDay,
      status: EquipmentReservationStatus.ACTIVE,
    },
    select: { startTime: true, endTime: true },
  });

  if (
    reservationTimeOverlapsExisting(
      { startTime: parsed.data.startTime, endTime: parsed.data.endTime },
      existingTimes
    )
  ) {
    redirect(
      err(fallback, "That equipment already has an overlapping reservation at this time.")
    );
  }

  let reservedByCoachId: string;
  if (session.role === "SUPER_ADMIN") {
    reservedByCoachId = team.coachId;
  } else if (isCoachSession(session)) {
    reservedByCoachId = session.coachId;
  } else {
    reservedByCoachId = team.coachId;
  }

  try {
    const row = await prisma.equipmentReservation.create({
      data: {
        equipmentItemId: item.id,
        teamId: team.id,
        reservedByCoachId,
        reservationDate: reservationDay,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        quantity: parsed.data.quantity,
        linkedFieldAssignmentId: linkedId,
        status: EquipmentReservationStatus.ACTIVE,
        notes: parsed.data.notes ?? null,
      },
    });
    await auditLog(session, "EquipmentReservation", row.id, "create", {
      equipmentItemId: item.id,
      teamId: team.id,
    });
  } catch {
    redirect(err(fallback, "Could not create reservation."));
  }

  revalidatePath("/fields/equipment");
  revalidatePath("/fields/schedule");
  redirect(fallback);
}

export async function cancelEquipmentReservationAction(formData: FormData) {
  const parsed = cancelEquipmentReservationSchema.safeParse({
    reservationId: String(formData.get("reservationId") ?? ""),
  });
  const locHint = String(formData.get("locationId") ?? "").trim();
  const fallback = equipmentHref(locHint || undefined);

  if (!parsed.success) {
    redirect(err(fallback, "Invalid reservation."));
  }

  const session = await getSession();
  if (!session) redirect("/login");

  let staffRole: import("@prisma/client").StaffRole | null = null;
  let primaryLocationId: string | null = null;
  if (session.role !== "SUPER_ADMIN" && isCoachSession(session)) {
    const row = await prisma.coach.findFirst({
      where: { id: session.coachId, isActive: true },
      select: { staffRole: true, primaryLocationId: true },
    });
    staffRole = row?.staffRole ?? null;
    primaryLocationId = row?.primaryLocationId ?? null;
  }

  const bypass = mayAccessFieldInfrastructureAdmin(session, staffRole);

  const existing = await prisma.equipmentReservation.findFirst({
    where: { id: parsed.data.reservationId },
    include: {
      equipmentItem: { select: { locationId: true } },
    },
  });
  if (!existing) {
    redirect(err(fallback, "Reservation not found."));
  }

  const locId = existing.equipmentItem.locationId;

  if (bypass || session.role === "SUPER_ADMIN") {
    if (
      session.role !== "SUPER_ADMIN" &&
      !canManageFieldComplexesForLocation(
        session,
        staffRole,
        primaryLocationId,
        locId
      )
    ) {
      redirect(err(fallback, "Not authorized."));
    }
  } else if (!isCoachSession(session)) {
    redirect(err(fallback, "Not authorized."));
  } else if (existing.reservedByCoachId !== session.coachId) {
    redirect(err(fallback, "You can only cancel your own reservations."));
  }

  if (existing.status !== EquipmentReservationStatus.ACTIVE) {
    redirect(err(fallback, "Reservation is not active."));
  }

  await prisma.equipmentReservation.update({
    where: { id: parsed.data.reservationId },
    data: { status: EquipmentReservationStatus.CANCELLED },
  });
  await auditLog(session, "EquipmentReservation", parsed.data.reservationId, "cancel", {});
  revalidatePath("/fields/equipment");
  revalidatePath("/fields/schedule");
  redirect(fallback);
}

export type WizardEquipmentDropResult = { ok: true } | { ok: false; error: string };

/**
 * Scheduling wizard — drag catalog equipment onto a session block to reserve for that team/date/time.
 */
export async function createWizardEquipmentReservationOnAssignmentAction(
  formData: FormData
): Promise<WizardEquipmentDropResult> {
  const parsed = wizardEquipmentDropOnAssignmentSchema.safeParse({
    locationId: String(formData.get("locationId") ?? ""),
    equipmentItemId: String(formData.get("equipmentItemId") ?? ""),
    fieldAssignmentId: String(formData.get("fieldAssignmentId") ?? ""),
    quantity: formData.get("quantity") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "Check equipment selection and session link." };
  }

  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in and try again." };

  let staffRole: import("@prisma/client").StaffRole | null = null;
  let primaryLocationId: string | null = null;
  if (session.role !== "SUPER_ADMIN" && isCoachSession(session)) {
    const row = await prisma.coach.findFirst({
      where: { id: session.coachId, isActive: true },
      select: { staffRole: true, primaryLocationId: true },
    });
    staffRole = row?.staffRole ?? null;
    primaryLocationId = row?.primaryLocationId ?? null;
  }

  const bypassCoachRules =
    session.role === "SUPER_ADMIN" ||
    mayAccessFieldInfrastructureAdmin(session, staffRole);

  if (!bypassCoachRules && !isCoachSession(session)) {
    return { ok: false, error: "Sign in as staff to reserve equipment." };
  }

  const assignment = await prisma.fieldAssignment.findFirst({
    where: {
      id: parsed.data.fieldAssignmentId,
      field: { complex: { locationId: parsed.data.locationId } },
    },
    select: {
      id: true,
      teamId: true,
      assignmentDate: true,
      startTime: true,
      endTime: true,
      team: { select: { coachId: true, locationId: true, seasonLabel: true } },
    },
  });
  if (!assignment) return { ok: false, error: "Session not found for this schedule." };

  const reservationDateStr = formatYmdLocal(assignment.assignmentDate);
  const reservationDay = parseYmdLocal(reservationDateStr);

  const item = await prisma.equipmentItem.findFirst({
    where: { id: parsed.data.equipmentItemId, isActive: true },
    select: { id: true, locationId: true, name: true, concurrentCapacity: true },
  });
  if (!item || item.locationId !== parsed.data.locationId) {
    return { ok: false, error: "Equipment must belong to this location." };
  }

  const team = await prisma.team.findFirst({
    where: { id: assignment.teamId },
    select: { id: true, coachId: true, locationId: true, seasonLabel: true },
  });
  if (!team || team.locationId !== item.locationId) {
    return { ok: false, error: "Team location must match the equipment pool." };
  }

  if (bypassCoachRules) {
    if (
      session.role !== "SUPER_ADMIN" &&
      !canManageFieldComplexesForLocation(session, staffRole, primaryLocationId, item.locationId)
    ) {
      return { ok: false, error: "Not authorized for this location." };
    }
  } else if (team.coachId !== session.coachId) {
    return { ok: false, error: "You can only book gear for teams you coach." };
  }

  if (!bypassCoachRules) {
    if (!isReservationDateInCurrentLocalWeek(new Date(), reservationDay)) {
      return {
        ok: false,
        error:
          "Reservations must fall in the current calendar week (Sunday–Saturday). Directors can book any week.",
      };
    }
  }

  if (parsed.data.quantity > item.concurrentCapacity) {
    return {
      ok: false,
      error: `You can reserve at most ${item.concurrentCapacity} unit(s) of this equipment in one booking (pool size).`,
    };
  }

  const linkedId = assignment.id;
  const faCheck = await prisma.fieldAssignment.findFirst({
    where: {
      id: linkedId,
      teamId: team.id,
      field: { complex: { locationId: item.locationId } },
    },
    select: { assignmentDate: true },
  });
  if (!faCheck) {
    return { ok: false, error: "Linked field session must match this team and location." };
  }
  if (formatYmdLocal(faCheck.assignmentDate) !== reservationDateStr) {
    return { ok: false, error: "Linked session must be on the same calendar date." };
  }

  const existingTimes = await prisma.equipmentReservation.findMany({
    where: {
      equipmentItemId: item.id,
      reservationDate: reservationDay,
      status: EquipmentReservationStatus.ACTIVE,
    },
    select: { startTime: true, endTime: true },
  });

  if (
    reservationTimeOverlapsExisting(
      { startTime: assignment.startTime, endTime: assignment.endTime },
      existingTimes
    )
  ) {
    return {
      ok: false,
      error: "That equipment already has an overlapping reservation at this time.",
    };
  }

  let reservedByCoachId: string;
  if (session.role === "SUPER_ADMIN") {
    reservedByCoachId = team.coachId;
  } else if (isCoachSession(session)) {
    reservedByCoachId = session.coachId;
  } else {
    reservedByCoachId = team.coachId;
  }

  try {
    const row = await prisma.equipmentReservation.create({
      data: {
        equipmentItemId: item.id,
        teamId: team.id,
        reservedByCoachId,
        reservationDate: reservationDay,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        quantity: parsed.data.quantity,
        linkedFieldAssignmentId: linkedId,
        status: EquipmentReservationStatus.ACTIVE,
        notes: null,
      },
    });
    await auditLog(session, "EquipmentReservation", row.id, "create", {
      equipmentItemId: item.id,
      teamId: team.id,
      wizardLinkedAssignmentId: linkedId,
    });
  } catch {
    return { ok: false, error: "Could not create reservation." };
  }

  revalidatePath("/fields/equipment");
  revalidatePath("/fields/schedule");
  return { ok: true };
}

export type WizardEquipmentReviewResult = { ok: true } | { ok: false; error: string };

export async function reviewEquipmentReservationFromWizardAction(
  formData: FormData
): Promise<WizardEquipmentReviewResult> {
  const reservationId = String(formData.get("reservationId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  if (!reservationId) return { ok: false, error: "Reservation is required." };
  if (decision !== "approve" && decision !== "deny") {
    return { ok: false, error: "Decision must be approve or deny." };
  }

  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in and try again." };

  let staffRole: import("@prisma/client").StaffRole | null = null;
  let primaryLocationId: string | null = null;
  if (session.role !== "SUPER_ADMIN" && isCoachSession(session)) {
    const row = await prisma.coach.findFirst({
      where: { id: session.coachId, isActive: true },
      select: { staffRole: true, primaryLocationId: true },
    });
    staffRole = row?.staffRole ?? null;
    primaryLocationId = row?.primaryLocationId ?? null;
  }

  const existing = await prisma.equipmentReservation.findFirst({
    where: { id: reservationId },
    include: {
      equipmentItem: { select: { locationId: true } },
    },
  });
  if (!existing) return { ok: false, error: "Reservation not found." };

  const locId = existing.equipmentItem.locationId;
  const canReview =
    session.role === "SUPER_ADMIN" ||
    canManageFieldComplexesForLocation(session, staffRole, primaryLocationId, locId);
  if (!canReview) return { ok: false, error: "Not authorized for this location." };

  if (existing.status !== EquipmentReservationStatus.ACTIVE) {
    return { ok: false, error: "Reservation is not active." };
  }

  if (decision === "approve") {
    await auditLog(session, "EquipmentReservation", reservationId, "wizard_approve", {});
    return { ok: true };
  }

  await prisma.equipmentReservation.update({
    where: { id: reservationId },
    data: { status: EquipmentReservationStatus.CANCELLED },
  });
  await auditLog(session, "EquipmentReservation", reservationId, "wizard_deny", {});
  revalidatePath("/fields/equipment");
  revalidatePath("/fields/schedule");
  return { ok: true };
}
