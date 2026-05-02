"use server";

import { ProspectStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import {
  assertCoachActive,
  canAssignOrReassignProspect,
  canCoachUpdateProspectAssignmentsOnly,
  canDeleteProspect,
} from "@/lib/rbac";
import { findActiveCoachStaffById } from "@/lib/staff/coach-staff-record";
import {
  createProspectRecord,
  deriveStatusTimestampPatch,
  resolveProspectLocation,
} from "@/lib/services/prospects.service";
import {
  prospectAssignSchema,
  prospectCoachPatchSchema,
  prospectCreateSchema,
  prospectDeleteSchema,
  prospectDirectorRowSchema,
} from "@/lib/validation/prospects";

function prospectErr(msg: string) {
  return `/prospects?error=${encodeURIComponent(msg)}`;
}

function prospectNewErr(msg: string) {
  return `/prospects/new?error=${encodeURIComponent(msg)}`;
}

async function viewerProspectRights() {
  const session = await getSession();
  if (!session) redirect("/login");
  let staffRole: import("@prisma/client").StaffRole | null = null;
  if (isCoachSession(session)) {
    const row = await findActiveCoachStaffById(session.coachId);
    if (!row) redirect(prospectErr("Your staff profile is inactive or missing."));
    staffRole = row.staffRole;
  }
  return { session, staffRole };
}

export async function createProspectAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "SUPER_ADMIN") redirect(prospectNewErr("Log in as a staff coach identity to submit prospects."));
  if (!isCoachSession(session)) redirect("/login");

  const submitter = await findActiveCoachStaffById(session.coachId);
  if (!submitter) redirect(prospectNewErr("Your staff profile is inactive or missing."));

  const parsed = prospectCreateSchema.safeParse({
    prospectType: String(formData.get("prospectType") ?? ""),
    prospectName: String(formData.get("prospectName") ?? ""),
    contactFirstName: String(formData.get("contactFirstName") ?? ""),
    contactLastName: String(formData.get("contactLastName") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    primaryLocationChoice: String(formData.get("primaryLocationChoice") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.success) redirect(prospectNewErr("Check prospect fields."));
  try {
    await createProspectRecord({
      data: parsed.data,
      submittedByCoachId: submitter.id,
    });
    await auditLog(session, "Prospect", "(new)", "create", {});
  } catch {
    redirect(prospectNewErr("Unable to save prospect."));
  }

  revalidatePath("/dashboard");
  revalidatePath("/prospects");
  redirect("/dashboard?prospectAdded=1");
}

export async function assignProspectAction(formData: FormData) {
  const { session, staffRole } = await viewerProspectRights();

  const parsed = prospectAssignSchema.safeParse({
    prospectId: String(formData.get("prospectId") ?? ""),
    assignedToCoachId: String(formData.get("assignedToCoachId") ?? ""),
  });
  if (!parsed.success) redirect(prospectErr("Invalid assignment form."));

  if (!canAssignOrReassignProspect(session, staffRole)) {
    redirect(prospectErr("Not authorized to assign prospects."));
  }

  const prospectId = parsed.data.prospectId;
  const assignedToCoachIdRaw = parsed.data.assignedToCoachId;
  const assignedToCoachId = assignedToCoachIdRaw.length === 0 ? null : assignedToCoachIdRaw;

  if (assignedToCoachId) await assertCoachActive(assignedToCoachId);

  const existing = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!existing) redirect(prospectErr("Prospect not found."));

  const now = new Date();
  try {
    const nextStatus =
      assignedToCoachId && existing.status === ProspectStatus.NEW
        ? ProspectStatus.ASSIGNED
        : existing.status;

    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        assignedToCoachId,
        assignedAt: assignedToCoachId ? now : null,
        status: nextStatus,
      },
    });
    await auditLog(session, "Prospect", prospectId, "assign", { assignedToCoachId });
  } catch {
    redirect(prospectErr("Unable to assign prospect."));
  }
  revalidatePath("/dashboard");
  revalidatePath("/prospects");
  redirect("/prospects");
}

export async function updateProspectByAssigneeAction(formData: FormData) {
  const session = await getSession();
  if (!session || !isCoachSession(session)) redirect("/login");
  const viewer = await findActiveCoachStaffById(session.coachId);
  if (!viewer) redirect(prospectErr("Your staff profile is inactive or missing."));

  const parsed = prospectCoachPatchSchema.safeParse({
    prospectId: String(formData.get("prospectId") ?? ""),
    status: String(formData.get("status") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!parsed.success) redirect(prospectErr("Invalid update."));
  const prospect = await prisma.prospect.findUnique({ where: { id: parsed.data.prospectId } });
  if (!prospect) redirect(prospectErr("Prospect not found."));

  if (
    !canCoachUpdateProspectAssignmentsOnly(session, viewer.staffRole, session.coachId, prospect)
  ) {
    redirect(prospectErr("Not authorized to edit this prospect."));
  }

  const stamp = deriveStatusTimestampPatch(prospect.status, parsed.data.status);
  try {
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: {
        status: parsed.data.status,
        notes: parsed.data.notes?.trim()?.length ? parsed.data.notes.trim() : null,
        ...stamp,
      },
    });
    await auditLog(session, "Prospect", prospect.id, "updateAssigneeFields", {});
  } catch {
    redirect(prospectErr("Unable to update prospect."));
  }
  revalidatePath("/dashboard");
  revalidatePath("/prospects");
  redirect("/dashboard");
}

export async function updateProspectDirectorAction(formData: FormData) {
  const { session, staffRole } = await viewerProspectRights();

  const parsed = prospectDirectorRowSchema.safeParse({
    prospectId: String(formData.get("prospectId") ?? ""),
    prospectType: String(formData.get("prospectType") ?? ""),
    prospectName: String(formData.get("prospectName") ?? ""),
    contactFirstName: String(formData.get("contactFirstName") ?? ""),
    contactLastName: String(formData.get("contactLastName") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    primaryLocationChoice: String(formData.get("primaryLocationChoice") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    status: String(formData.get("status") ?? ""),
  });
  if (!parsed.success) redirect(prospectErr("Invalid director update."));
  if (!canAssignOrReassignProspect(session, staffRole)) redirect(prospectErr("Not authorized."));

  const prospect = await prisma.prospect.findUnique({ where: { id: parsed.data.prospectId } });
  if (!prospect) redirect(prospectErr("Prospect not found."));

  const d = parsed.data;
  const nextStatus = d.status;
  const stamp = deriveStatusTimestampPatch(prospect.status, nextStatus);
  try {
    const resolved = await resolveProspectLocation(d.primaryLocationChoice);
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: {
        prospectType: d.prospectType,
        prospectName: d.prospectName,
        contactFirstName: d.contactFirstName?.trim() ? d.contactFirstName.trim() : null,
        contactLastName: d.contactLastName?.trim() ? d.contactLastName.trim() : null,
        contactPhone: d.contactPhone?.trim() ? d.contactPhone.trim() : null,
        contactEmail: d.contactEmail?.trim() ? d.contactEmail.trim() : null,
        notes: d.notes?.trim() ? d.notes.trim() : null,
        status: d.status,
        locationId: resolved.locationId,
        locationUnknown: resolved.locationUnknown,
        ...stamp,
      },
    });
    await auditLog(session, "Prospect", prospect.id, "updateDirector", {});
  } catch {
    redirect(prospectErr("Unable to update prospect."));
  }
  revalidatePath("/prospects");
  revalidatePath("/dashboard");
  redirect("/prospects");
}

export async function deleteProspectAction(formData: FormData) {
  const { session, staffRole } = await viewerProspectRights();
  const parsed = prospectDeleteSchema.safeParse({
    prospectId: String(formData.get("prospectId") ?? ""),
  });
  if (!parsed.success) redirect(prospectErr("Invalid prospect id."));
  if (!canDeleteProspect(session, staffRole)) redirect(prospectErr("Not authorized to delete."));

  try {
    await prisma.prospect.delete({ where: { id: parsed.data.prospectId } });
    await auditLog(session, "Prospect", parsed.data.prospectId, "delete", {});
  } catch {
    redirect(prospectErr("Unable to delete prospect."));
  }

  revalidatePath("/dashboard");
  revalidatePath("/prospects");
  redirect("/prospects");
}
