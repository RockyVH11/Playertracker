import { z } from "zod";

export const loginFormSchema = z
  .object({
    kind: z.enum(["SUPER_ADMIN", "COACH"]),
    password: z.string().min(1, "Required"),
    coachId: z.string().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.kind === "COACH" && (!v.coachId || v.coachId.length === 0)) {
      ctx.addIssue({ code: "custom", message: "Select your coach name", path: ["coachId"] });
    }
  });
