"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth/session";
import { coachActiveSchema, coachCreateSchema } from "@/lib/validation/admin";

function err(msg: string) {
  return `/admin/coaches?error=${encodeURIComponent(msg)}`;
}

export async function createCoachAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");

  const raw = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    staffRoleLabel: String(formData.get("staffRoleLabel") ?? ""),
    primaryAreaLabel: String(formData.get("primaryAreaLabel") ?? ""),
  };
  const parsed = coachCreateSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(err("Check all fields."));
  }
  const d = parsed.data;

  try {
    const loc = await prisma.location.upsert({
      where: { name: d.primaryAreaLabel },
      update: {},
      create: { name: d.primaryAreaLabel },
    });

    let newId: string;
    if (d.email) {
      const upserted = await prisma.coach.upsert({
        where: { email: d.email },
        update: {
          firstName: d.firstName,
          lastName: d.lastName,
          staffRoleLabel: d.staffRoleLabel ?? null,
          primaryAreaLabel: d.primaryAreaLabel,
          primaryLocationId: loc.id,
          isActive: true,
        },
        create: {
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email,
          staffRoleLabel: d.staffRoleLabel ?? null,
          primaryAreaLabel: d.primaryAreaLabel,
          primaryLocationId: loc.id,
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
            staffRoleLabel: d.staffRoleLabel ?? null,
            primaryAreaLabel: d.primaryAreaLabel,
            primaryLocationId: loc.id,
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
            staffRoleLabel: d.staffRoleLabel ?? null,
            primaryAreaLabel: d.primaryAreaLabel,
            primaryLocationId: loc.id,
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
    redirect(err("Could not create coach (duplicate email or invalid data)."));
  }
  revalidatePath("/admin/coaches");
  revalidatePath("/login");
  redirect("/admin/coaches");
}

export async function setCoachActiveAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");
  const parsed = coachActiveSchema.safeParse({
    coachId: String(formData.get("coachId") ?? ""),
    isActive: String(formData.get("isActive") ?? "false"),
  });
  if (!parsed.success) redirect(err("Invalid coach form."));
  const { coachId, isActive } = parsed.data;
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
    redirect(err("Unable to update coach."));
  }
  revalidatePath("/admin/coaches");
  revalidatePath("/login");
  redirect("/admin/coaches");
}
