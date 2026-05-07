"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldRequestStatus } from "@prisma/client";
import { auditLog } from "@/lib/audit-log";
import { peerConflictMessage } from "@/lib/fields/field-assignment-peer-conflicts";
import { parseYmdLocal } from "@/lib/fields/local-date";
import { prisma } from "@/lib/prisma";
import {
  assertCanModerateFieldRequest,
  requireFieldRequestSubmitter,
  requireFieldRequestsBoardViewer,
} from "@/lib/server/field-requests-access";
import {
  approveFieldRequestWithAssignmentSchema,
  createFieldRequestSchema,
  setFieldRequestStatusSchema,
} from "@/lib/validation/field-request";

function err(path: string, msg: string) {
  return `${path}?error=${encodeURIComponent(msg)}`;
}

export async function createFieldRequestAction(formData: FormData) {
  const v = await requireFieldRequestSubmitter();
  const dupRaw = formData.getAll("duplicateToOtherDays").map(String);
  const parsed = createFieldRequestSchema.safeParse({
    teamId: String(formData.get("teamId") ?? ""),
    preferredDayOfWeek: String(formData.get("preferredDayOfWeek") ?? ""),
    preferredStartTime: String(formData.get("preferredStartTime") ?? ""),
    preferredSessionLengthMinutes: String(formData.get("preferredSessionLengthMinutes") ?? ""),
    preferredFieldId: String(formData.get("preferredFieldId") ?? ""),
    recurrenceRequested: formData.get("recurrenceRequested") === "on",
    recurrenceEndDate: String(formData.get("recurrenceEndDate") ?? ""),
    duplicateToOtherDays: dupRaw,
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.teamId?.[0] ??
      parsed.error.flatten().fieldErrors.preferredStartTime?.[0] ??
      parsed.error.flatten().fieldErrors.recurrenceEndDate?.[0] ??
      "Check your entries and try again.";
    redirect(err("/fields/requests/new", msg));
  }

  const team = await prisma.team.findFirst({
    where: { id: parsed.data.teamId },
    select: {
      id: true,
      seasonLabel: true,
      coachId: true,
      locationId: true,
    },
  });
  if (!team || team.coachId !== v.session.coachId) {
    redirect(err("/fields/requests/new", "Pick one of your teams."));
  }

  if (parsed.data.preferredFieldId) {
    const fieldOk = await prisma.field.findFirst({
      where: {
        id: parsed.data.preferredFieldId,
        isActive: true,
        complex: { locationId: team.locationId, isActive: true },
      },
    });
    if (!fieldOk) {
      redirect(err("/fields/requests/new", "Preferred field must belong to your team's location."));
    }
  }

  let recurrenceEnd: Date | null = null;
  if (
    parsed.data.recurrenceRequested &&
    parsed.data.recurrenceEndDate &&
    parsed.data.recurrenceEndDate.trim() !== ""
  ) {
    recurrenceEnd = new Date(`${parsed.data.recurrenceEndDate.trim()}T12:00:00`);
  }

  try {
    const created = await prisma.fieldRequest.create({
      data: {
        seasonLabel: team.seasonLabel,
        teamId: team.id,
        requestedByCoachId: v.session.coachId,
        preferredDayOfWeek: parsed.data.preferredDayOfWeek,
        preferredStartTime: parsed.data.preferredStartTime,
        preferredSessionLengthMinutes: parsed.data.preferredSessionLengthMinutes,
        preferredFieldId: parsed.data.preferredFieldId ?? null,
        recurrenceRequested: parsed.data.recurrenceRequested,
        recurrenceEndDate: recurrenceEnd,
        duplicateToOtherDays: parsed.data.duplicateToOtherDays,
        notes: parsed.data.notes ?? null,
        status: FieldRequestStatus.PENDING,
      },
    });
    await auditLog(v.session, "FieldRequest", created.id, "create", {
      teamId: team.id,
    });
  } catch {
    redirect(err("/fields/requests/new", "Could not submit request."));
  }
  revalidatePath("/fields/requests");
  redirect("/fields/requests/new?submitted=1");
}

function scheduleHref(locationId: string | undefined, dateYmd: string) {
  if (locationId) {
    return `/fields/schedule?locationId=${encodeURIComponent(locationId)}&date=${encodeURIComponent(dateYmd)}`;
  }
  return `/fields/schedule?date=${encodeURIComponent(dateYmd)}`;
}

export async function approveFieldRequestWithAssignmentAction(formData: FormData) {
  const v = await requireFieldRequestsBoardViewer();
  const parsed = approveFieldRequestWithAssignmentSchema.safeParse({
    requestId: String(formData.get("requestId") ?? ""),
    assignmentDate: String(formData.get("assignmentDate") ?? ""),
    fieldId: String(formData.get("fieldId") ?? ""),
    startTime: String(formData.get("startTime") ?? ""),
    endTime: String(formData.get("endTime") ?? ""),
    directorNotes: String(formData.get("directorNotes") ?? ""),
  });
  if (!parsed.success) {
    redirect(err("/fields/requests", "Check date, field, and times and try again."));
  }

  try {
    await assertCanModerateFieldRequest(v, parsed.data.requestId);
  } catch (e) {
    if ((e as Error).message === "not_found") {
      redirect(err("/fields/requests", "Request not found."));
    }
    redirect(err("/fields/requests", "Not authorized for this request."));
  }

  const req = await prisma.fieldRequest.findFirst({
    where: { id: parsed.data.requestId },
    include: { team: { select: { id: true, locationId: true, seasonLabel: true } } },
  });
  if (!req) {
    redirect(err("/fields/requests", "Request not found."));
  }
  if (req.status !== FieldRequestStatus.PENDING) {
    redirect(err("/fields/requests", "Only pending requests can be approved with an assignment."));
  }

  const fieldRow = await prisma.field.findFirst({
    where: {
      id: parsed.data.fieldId,
      isActive: true,
      complex: { locationId: req.team.locationId, isActive: true },
    },
  });
  if (!fieldRow) {
    redirect(err("/fields/requests", "Pick an active field at this team’s location."));
  }

  const assignmentDate = parseYmdLocal(parsed.data.assignmentDate);
  const peers = await prisma.fieldAssignment.findMany({
    where: {
      assignmentDate,
      field: { complex: { locationId: req.team.locationId } },
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
    teamId: req.teamId,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
  });
  if (conflict) {
    redirect(err("/fields/requests", conflict));
  }

  try {
    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.fieldAssignment.create({
        data: {
          seasonLabel: req.team.seasonLabel,
          teamId: req.teamId,
          fieldId: parsed.data.fieldId,
          assignmentDate,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          notes: null,
          sourceRequestId: req.id,
        },
      });
      await tx.fieldRequest.update({
        where: { id: req.id },
        data: {
          status: FieldRequestStatus.APPROVED,
          directorNotes: parsed.data.directorNotes ?? null,
        },
      });
      return created;
    });

    await auditLog(v.session, "FieldAssignment", assignment.id, "create", {
      fieldId: assignment.fieldId,
      teamId: assignment.teamId,
      sourceRequestId: req.id,
    });
    await auditLog(v.session, "FieldRequest", req.id, "approve_with_assignment", {
      assignmentId: assignment.id,
      directorNotes: parsed.data.directorNotes,
    });
  } catch {
    redirect(err("/fields/requests", "Could not approve and assign."));
  }

  revalidatePath("/fields/requests");
  revalidatePath("/fields/schedule");
  redirect(scheduleHref(req.team.locationId, parsed.data.assignmentDate));
}

export async function setFieldRequestStatusAction(formData: FormData) {
  const v = await requireFieldRequestsBoardViewer();
  const dirNotesRaw = String(formData.get("directorNotes") ?? "").trim();
  const parsed = setFieldRequestStatusSchema.safeParse({
    requestId: String(formData.get("requestId") ?? ""),
    status: String(formData.get("status") ?? ""),
    directorNotes: dirNotesRaw.length ? dirNotesRaw : undefined,
  });
  if (!parsed.success) {
    redirect(err("/fields/requests", "Invalid request."));
  }
  try {
    await assertCanModerateFieldRequest(v, parsed.data.requestId);
  } catch (e) {
    if ((e as Error).message === "not_found") {
      redirect(err("/fields/requests", "Request not found."));
    }
    redirect(err("/fields/requests", "Not authorized for this request."));
  }

  const existing = await prisma.fieldRequest.findFirst({
    where: { id: parsed.data.requestId },
    select: { status: true },
  });
  if (!existing) {
    redirect(err("/fields/requests", "Request not found."));
  }
  if (existing.status !== FieldRequestStatus.PENDING) {
    redirect(err("/fields/requests", "Only pending requests can be approved or denied."));
  }

  if (parsed.data.status === "APPROVED") {
    redirect(
      err(
        "/fields/requests",
        "Pending approvals must include a date, field, and times on the pending row."
      )
    );
  }

  const status = FieldRequestStatus.DENIED;

  await prisma.fieldRequest.update({
    where: { id: parsed.data.requestId },
    data: {
      status,
      directorNotes: parsed.data.directorNotes != null ? parsed.data.directorNotes : null,
    },
  });
  await auditLog(v.session, "FieldRequest", parsed.data.requestId, "status", parsed.data);
  revalidatePath("/fields/requests");
  redirect("/fields/requests");
}
