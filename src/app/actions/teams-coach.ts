"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth/session";
import { updateTeam } from "@/lib/services/teams.service";
import { teamCoachUpdateSchema } from "@/lib/validation/teams";

function backUrl(teamId: string, error?: string) {
  const base = `/teams/${teamId}`;
  if (!error) return base;
  return `${base}?error=${encodeURIComponent(error)}`;
}

export async function updateTeamCoachAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const parsed = teamCoachUpdateSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    coachEstimatedPlayerCount: String(formData.get("coachEstimatedPlayerCount") ?? ""),
    recruitingNeeds: String(formData.get("recruitingNeeds") ?? "") || null,
  });
  if (!parsed.success) {
    const id = String(formData.get("id") ?? "");
    redirect(backUrl(id, "Invalid team update."));
  }
  await updateTeam({
    session,
    id: parsed.data.id,
    data: {
      coachEstimatedPlayerCount: parsed.data.coachEstimatedPlayerCount,
      recruitingNeeds: parsed.data.recruitingNeeds,
    },
  });
  await auditLog(session, "Team", parsed.data.id, "coachUpdateEstimate", {});
  revalidatePath("/teams");
  revalidatePath(`/teams/${parsed.data.id}`);
  redirect(backUrl(parsed.data.id));
}
