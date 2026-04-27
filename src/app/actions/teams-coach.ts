"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { updateTeam } from "@/lib/services/teams.service";

const schema = z
  .object({
    id: z.string().cuid(),
    coachEstimatedPlayerCount: z.coerce.number().int().min(0),
    recruitingNeeds: z.string().optional().nullable(),
  })
  .strict();

export async function updateTeamCoachAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const parsed = schema.safeParse({
    id: String(formData.get("id") ?? ""),
    coachEstimatedPlayerCount: String(formData.get("coachEstimatedPlayerCount") ?? ""),
    recruitingNeeds: String(formData.get("recruitingNeeds") ?? "") || null,
  });
  if (!parsed.success) {
    throw new Error("Invalid");
  }
  await updateTeam({
    session,
    id: parsed.data.id,
    data: {
      coachEstimatedPlayerCount: parsed.data.coachEstimatedPlayerCount,
      recruitingNeeds: parsed.data.recruitingNeeds,
    },
  });
  revalidatePath("/teams");
  revalidatePath(`/teams/${parsed.data.id}`);
  redirect(`/teams/${parsed.data.id}`);
}
