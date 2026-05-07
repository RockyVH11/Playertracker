import { z } from "zod";

export const loginFormSchema = z
  .object({
    kind: z.enum(["SUPER_ADMIN", "COACH", "DIRECTOR"]),
    password: z.string().min(1, "Required"),
    coachId: z.string().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      (v.kind === "COACH" || v.kind === "DIRECTOR") &&
      (!v.coachId || v.coachId.length === 0)
    ) {
      ctx.addIssue({ code: "custom", message: "Select your name", path: ["coachId"] });
    }
  });
