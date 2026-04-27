export type AppRole = "SUPER_ADMIN" | "COACH";

export type SessionPayload = {
  role: AppRole;
  /** Required when `role` is `COACH` */
  coachId: string | null;
};

export function isCoachSession(
  s: SessionPayload
): s is SessionPayload & { role: "COACH"; coachId: string } {
  return s.role === "COACH" && s.coachId != null;
}
