import type { EvaluationLevel, StaffRole } from "@prisma/client";
import { displayStaffRole } from "@/lib/staff/staff-role-label";

const labels: Record<EvaluationLevel, string> = {
  RL: "RL",
  N1: "N1",
  N2: "N2",
  GRASSROOTS: "Grassroots",
  NOT_EVALUATED: "Not evaluated yet",
};

export function formatEval(l: EvaluationLevel) {
  return labels[l] ?? l;
}

/** Dropdown label: name, optional role/staff title, optional area or email fallback. */
export function formatCoachPickerLabel(c: {
  firstName: string;
  lastName: string;
  email?: string | null;
  staffRole?: StaffRole | null;
  staffRoleLabel?: string | null;
  primaryAreaLabel?: string | null;
  primaryLocation?: { name: string } | null;
}): string {
  const area =
    (c.primaryAreaLabel && c.primaryAreaLabel.trim()) ||
    c.primaryLocation?.name?.trim() ||
    "";
  const bits = [`${c.lastName}, ${c.firstName}`];
  const enumRole =
    c.staffRole != null ? displayStaffRole(c.staffRole) : "";
  const role = (enumRole && enumRole.trim()) || c.staffRoleLabel?.trim() || "";
  if (role) bits.push(role);
  if (area) bits.push(area);
  else if (c.email?.trim()) bits.push(c.email.trim());
  return bits.join(" — ");
}
