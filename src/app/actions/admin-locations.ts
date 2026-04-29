"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth/session";
import { locationCreateSchema, locationIdSchema } from "@/lib/validation/admin";

function err(path: string, msg: string) {
  return `${path}?error=${encodeURIComponent(msg)}`;
}

export async function createLocationAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");
  const raw = String(formData.get("name") ?? "");
  const parsed = locationCreateSchema.safeParse({ name: raw });
  if (!parsed.success) redirect(err("/admin/locations", "Invalid location name."));
  try {
    const loc = await prisma.location.create({ data: { name: parsed.data.name } });
    await auditLog(session, "Location", loc.id, "create", { name: loc.name });
  } catch {
    redirect(err("/admin/locations", "Could not create location (duplicate name?)."));
  }
  revalidatePath("/admin/locations");
  revalidatePath("/teams");
  revalidatePath("/players");
  redirect("/admin/locations");
}

export async function deleteLocationAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");
  const raw = String(formData.get("id") ?? "");
  const parsed = locationIdSchema.safeParse({ id: raw });
  if (!parsed.success) redirect(err("/admin/locations", "Invalid id."));
  const id = parsed.data.id;
  const blocking = await prisma.$transaction([
    prisma.team.count({ where: { locationId: id } }),
    prisma.player.count({ where: { locationId: id } }),
    prisma.coach.count({ where: { primaryLocationId: id } }),
  ]);
  if (blocking[0] > 0 || blocking[1] > 0 || blocking[2] > 0) {
    redirect(
      err("/admin/locations", "Location is still referenced by teams, players, or coach primary locations.")
    );
  }
  try {
    await prisma.location.delete({ where: { id } });
    await auditLog(session, "Location", id, "delete", {});
  } catch {
    redirect(err("/admin/locations", "Could not delete location."));
  }
  revalidatePath("/admin/locations");
  revalidatePath("/teams");
  revalidatePath("/players");
  redirect("/admin/locations");
}
