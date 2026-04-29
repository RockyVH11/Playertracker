"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth/session";
import { leagueUpdateSchema } from "@/lib/validation/admin";

function err(path: string, msg: string) {
  return `${path}?error=${encodeURIComponent(msg)}`;
}

export async function updateLeagueAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");
  const raw = {
    id: String(formData.get("id") ?? ""),
    allowedGender: String(formData.get("allowedGender") ?? ""),
    adminOverrideAllowed:
      String(formData.get("adminOverrideAllowed") ?? "off") === "on",
    conference: String(formData.get("conference") ?? ""),
    ageGroup: String(formData.get("ageGroup") ?? ""),
    hierarchy: String(formData.get("hierarchy") ?? ""),
    capacity: String(formData.get("capacity") ?? ""),
    format: String(formData.get("format") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
  const parsed = leagueUpdateSchema.safeParse({
    id: raw.id,
    allowedGender: raw.allowedGender,
    adminOverrideAllowed: raw.adminOverrideAllowed,
    conference: raw.conference || null,
    ageGroup: raw.ageGroup || null,
    hierarchy: raw.hierarchy,
    capacity: raw.capacity,
    format: raw.format || null,
    notes: raw.notes || null,
  });
  if (!parsed.success) {
    redirect(err(`/admin/leagues`, "Invalid league form."));
  }
  const p = parsed.data;
  try {
    const existing = await prisma.league.findUnique({ where: { id: p.id } });
    await prisma.league.update({
      where: { id: p.id },
      data: {
        allowedGender: p.allowedGender ?? null,
        adminOverrideAllowed: p.adminOverrideAllowed,
        conference: p.conference ?? null,
        ageGroup: p.ageGroup ?? null,
        hierarchy: p.hierarchy ?? null,
        capacity: p.capacity ?? null,
        format: p.format ?? null,
        notes: p.notes ?? null,
      },
    });
    await auditLog(session, "League", p.id, "update", { name: existing?.name });
  } catch {
    redirect(err("/admin/leagues", "Unable to update league."));
  }
  revalidatePath("/admin/leagues");
  revalidatePath("/teams");
  revalidatePath("/players");
  redirect("/admin/leagues");
}
