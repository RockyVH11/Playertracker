import { StaffRole } from "@prisma/client";

/** Best-effort mapping from CSV / legacy picker text to coarse app role. */
export function inferStaffRoleFromLabel(label: string | null | undefined): StaffRole {
  const t = (label ?? "").trim().toLowerCase();
  if (t.includes("director")) return StaffRole.DIRECTOR;
  if (t.includes("manager")) return StaffRole.MANAGER;
  return StaffRole.COACH;
}
