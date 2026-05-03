"use server";

import { StaffRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { findActiveCoachStaffById } from "@/lib/staff/coach-staff-record";
import { primaryAreaLabelFromLocationId, staffPickerLabel } from "@/lib/staff/coach-directory-writes";
import {
  mayAddStaffMember,
  mayDeleteStaffMember,
  staffRowEditMode,
} from "@/lib/staff/staff-row-edit-mode";
import {
  coachActiveSchema,
  coachCreateSchema,
  coachDeleteSchema,
  coachSelfContactSchema,
  coachUpdateSchema,
} from "@/lib/validation/admin";

function err(msg: string) {
  return `/staff?error=${encodeURIComponent(msg)}`;
}

type SessionNonNull = NonNullable<Awaited<ReturnType<typeof getSession>>>;

async function requireStaffMutationSession(): Promise<{
  session: SessionNonNull;
  viewerStaffRole: StaffRole | null;
  coachRow:
    | NonNullable<Awaited<ReturnType<typeof findActiveCoachStaffById>>>
    | undefined;
}> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "SUPER_ADMIN") {
    return { session, viewerStaffRole: null, coachRow: undefined };
  }
  if (!isCoachSession(session)) redirect("/login");
  const coachRow = await findActiveCoachStaffById(session.coachId);
  if (!coachRow) redirect(err("Your staff profile is inactive or missing."));
  return { session, viewerStaffRole: coachRow.staffRole, coachRow };
}

export async function createCoachAction(formData: FormData) {
  const { session, viewerStaffRole } = await requireStaffMutationSession();

  if (!mayAddStaffMember(session, viewerStaffRole)) redirect(err("Not authorized to add staff."));

  const parsed = coachCreateSchema.safeParse({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    staffRole: String(formData.get("staffRole") ?? ""),
    primaryLocationId: String(formData.get("primaryLocationId") ?? ""),
  });
  if (!parsed.success) redirect(err("Check all fields."));

  const d = parsed.data;
  const exists = await prisma.location.findUnique({ where: { id: d.primaryLocationId } });
  if (!exists) redirect(err("Invalid primary location."));
  const areaLabel = (await primaryAreaLabelFromLocationId(d.primaryLocationId)) ?? "";

  try {
    const roleLabel = staffPickerLabel(d.staffRole);

    let newId: string;
    if (d.email) {
      const upserted = await prisma.coach.upsert({
        where: { email: d.email },
        update: {
          firstName: d.firstName,
          lastName: d.lastName,
          phone: d.phone ?? null,
          staffRole: d.staffRole,
          staffRoleLabel: roleLabel,
          primaryAreaLabel: areaLabel,
          primaryLocationId: d.primaryLocationId,
          isActive: true,
        },
        create: {
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email,
          phone: d.phone ?? null,
          staffRole: d.staffRole,
          staffRoleLabel: roleLabel,
          primaryAreaLabel: areaLabel,
          primaryLocationId: d.primaryLocationId,
          isActive: true,
        },
        select: { id: true },
      });
      newId = upserted.id;
    } else {
      const dup = await prisma.coach.findFirst({
        where: { firstName: d.firstName, lastName: d.lastName },
      });
      if (dup) {
        const updated = await prisma.coach.update({
          where: { id: dup.id },
          data: {
            phone: d.phone ?? null,
            staffRole: d.staffRole,
            staffRoleLabel: roleLabel,
            primaryAreaLabel: areaLabel,
            primaryLocationId: d.primaryLocationId,
            isActive: true,
          },
          select: { id: true },
        });
        newId = updated.id;
      } else {
        const created = await prisma.coach.create({
          data: {
            firstName: d.firstName,
            lastName: d.lastName,
            email: null,
            phone: d.phone ?? null,
            staffRole: d.staffRole,
            staffRoleLabel: roleLabel,
            primaryAreaLabel: areaLabel,
            primaryLocationId: d.primaryLocationId,
            isActive: true,
          },
          select: { id: true },
        });
        newId = created.id;
      }
    }

    await auditLog(session, "Coach", newId, "create", {
      name: `${d.firstName} ${d.lastName}`,
    });
  } catch {
    redirect(err("Could not create staff member (duplicate email or invalid data)."));
  }

  revalidatePath("/staff");
  revalidatePath("/login");
  redirect("/staff");
}

export async function updateCoachSelfContactAction(formData: FormData) {
  const session = await getSession();
  if (!session || !isCoachSession(session)) redirect("/login");

  const coachRow = await findActiveCoachStaffById(session.coachId);
  if (!coachRow) redirect(err("Your staff profile is inactive or missing."));
  const viewerStaffRole = coachRow.staffRole;

  const parsed = coachSelfContactSchema.safeParse({
    coachId: String(formData.get("coachId") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  if (!parsed.success) redirect(err("Invalid contact form."));

  const d = parsed.data;
  const mode = staffRowEditMode(session, {
    viewerStaffRole,
    viewerCoachId: session.coachId,
    targetCoachId: d.coachId,
  });
  if (mode !== "contact_only") redirect(err("Cannot update this row."));

  try {
    const c = await prisma.coach.update({
      where: { id: d.coachId },
      data: { email: d.email ?? null, phone: d.phone ?? null },
      select: { id: true, firstName: true, lastName: true },
    });
    await auditLog(session, "Coach", c.id, "updateSelfContact", {
      name: `${c.firstName} ${c.lastName}`,
    });
  } catch {
    redirect(err("Unable to update contact (duplicate email?)."));
  }
  revalidatePath("/staff");
  revalidatePath("/login");
  redirect("/staff");
}

export async function updateCoachAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  let viewerStaffRole: StaffRole | null = null;
  if (session.role === "SUPER_ADMIN") {
    viewerStaffRole = null;
  } else if (isCoachSession(session)) {
    const row = await findActiveCoachStaffById(session.coachId);
    if (!row) redirect(err("Your staff profile is inactive or missing."));
    viewerStaffRole = row.staffRole;
  } else {
    redirect("/login");
  }

  const parsed = coachUpdateSchema.safeParse({
    coachId: String(formData.get("coachId") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    staffRole: String(formData.get("staffRole") ?? ""),
    primaryLocationId: String(formData.get("primaryLocationId") ?? ""),
    isActive: String(formData.get("isActive") ?? "true"),
  });
  if (!parsed.success) redirect(err("Invalid staff update form."));

  const d = parsed.data;

  const locOk = await prisma.location.findUnique({ where: { id: d.primaryLocationId } });
  if (!locOk) redirect(err("Invalid primary location."));

  if (!isCoachSession(session) && session.role !== "SUPER_ADMIN") redirect("/login");

  const viewerId = isCoachSession(session) ? session.coachId : null;
  const mode = staffRowEditMode(session, {
    viewerStaffRole,
    viewerCoachId: viewerId,
    targetCoachId: d.coachId,
  });

  if (mode !== "full") redirect(err("Not authorized to edit this staff member."));
  const areaLabel = (await primaryAreaLabelFromLocationId(d.primaryLocationId)) ?? "";

  try {
    const roleLabel = staffPickerLabel(d.staffRole);

    const c = await prisma.coach.update({
      where: { id: d.coachId },
      data: {
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email ?? null,
        phone: d.phone ?? null,
        staffRole: d.staffRole,
        staffRoleLabel: roleLabel,
        primaryAreaLabel: areaLabel,
        primaryLocationId: d.primaryLocationId,
        isActive: d.isActive,
      },
      select: { id: true, firstName: true, lastName: true },
    });
    await auditLog(session, "Coach", c.id, "update", {
      name: `${c.firstName} ${c.lastName}`,
      isActive: d.isActive,
    });
  } catch {
    redirect(err("Unable to update staff (duplicate email or active team constraints)."));
  }
  revalidatePath("/staff");
  revalidatePath("/teams");
  revalidatePath("/login");
  redirect("/staff");
}

export async function setCoachActiveAction(formData: FormData) {
  const { session, viewerStaffRole } = await requireStaffMutationSession();

  const parsed = coachActiveSchema.safeParse({
    coachId: String(formData.get("coachId") ?? ""),
    isActive: String(formData.get("isActive") ?? "false"),
  });
  if (!parsed.success) redirect(err("Invalid activation form."));
  const { coachId, isActive } = parsed.data;

  const viewerId = isCoachSession(session) ? session.coachId : null;
  const mode = staffRowEditMode(session, {
    viewerStaffRole,
    viewerCoachId: viewerId,
    targetCoachId: coachId,
  });
  if (mode !== "full") redirect(err("Not authorized to change status."));
  try {
    const c = await prisma.coach.update({
      where: { id: coachId },
      data: { isActive },
      select: { id: true, firstName: true, lastName: true },
    });
    await auditLog(session, "Coach", coachId, "setActive", {
      name: `${c.firstName} ${c.lastName}`,
      isActive,
    });
  } catch {
    redirect(err("Unable to update staff status."));
  }
  revalidatePath("/staff");
  revalidatePath("/login");
  redirect("/staff");
}

export async function deleteCoachAction(formData: FormData) {
  const session = await getSession();
  if (!session || !mayDeleteStaffMember(session)) redirect("/login");
  const parsed = coachDeleteSchema.safeParse({
    coachId: String(formData.get("coachId") ?? ""),
  });
  if (!parsed.success) redirect(err("Invalid coach id."));
  const coachId = parsed.data.coachId;
  try {
    const teamCount = await prisma.team.count({ where: { coachId } });
    if (teamCount > 0) {
      redirect(err("Staff member has assigned teams; reassign or remove teams first."));
    }
    const prospectRefs = await prisma.prospect.count({
      where: {
        OR: [{ submittedByCoachId: coachId }, { assignedToCoachId: coachId }],
      },
    });
    if (prospectRefs > 0) {
      redirect(err("Reassign or delete linked prospects before removing this staff member."));
    }
    await prisma.coach.delete({ where: { id: coachId } });
    await auditLog(session, "Coach", coachId, "delete", {});
  } catch {
    redirect(err("Unable to delete staff member."));
  }
  revalidatePath("/staff");
  revalidatePath("/login");
  redirect("/staff");
}
