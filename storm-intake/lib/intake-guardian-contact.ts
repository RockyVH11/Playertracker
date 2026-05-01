export type GuardianContactRaw = {
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
};

/** Normalizes and validates parent/guardian fields from intake form. */
export function parseGuardianContact(raw: GuardianContactRaw):
  | { ok: true; guardianName: string; guardianPhone: string; guardianEmail: string }
  | { ok: false; message: string } {
  const guardianName = raw.guardianName.trim();
  const guardianPhone = raw.guardianPhone.trim();
  const guardianEmail = raw.guardianEmail.trim();

  if (!guardianName || !guardianPhone || !guardianEmail) {
    return { ok: false, message: "Please add parent name, phone, and email." };
  }
  if (!guardianEmail.includes("@")) {
    return { ok: false, message: "Please enter a valid parent email." };
  }
  return { ok: true, guardianName, guardianPhone, guardianEmail };
}
