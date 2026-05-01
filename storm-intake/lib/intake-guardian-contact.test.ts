import { describe, expect, it } from "vitest";
import { parseGuardianContact } from "./intake-guardian-contact";

describe("parseGuardianContact", () => {
  it("accepts trimmed valid contact", () => {
    const r = parseGuardianContact({
      guardianName: " Jane Doe ",
      guardianPhone: " 5551234567 ",
      guardianEmail: " j@example.com ",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.guardianName).toBe("Jane Doe");
    expect(r.guardianEmail).toBe("j@example.com");
  });

  it("rejects missing fields", () => {
    const r = parseGuardianContact({
      guardianName: "",
      guardianPhone: "x",
      guardianEmail: "a@b.co",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/parent name/i);
  });

  it("rejects email without @", () => {
    const r = parseGuardianContact({
      guardianName: "A",
      guardianPhone: "1",
      guardianEmail: "notanemail",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/email/i);
  });
});
