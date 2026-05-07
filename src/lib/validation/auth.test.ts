import { describe, expect, it } from "vitest";
import { loginFormSchema } from "@/lib/validation/auth";

describe("loginFormSchema", () => {
  it("requires coachId for DIRECTOR", () => {
    const r = loginFormSchema.safeParse({
      kind: "DIRECTOR",
      password: "x",
    });
    expect(r.success).toBe(false);
  });

  it("accepts DIRECTOR with coachId", () => {
    const r = loginFormSchema.safeParse({
      kind: "DIRECTOR",
      password: "x",
      coachId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    });
    expect(r.success).toBe(true);
  });
});
