"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertCoachActive } from "@/lib/rbac";
import { verifySharedPassword } from "@/lib/auth/shared-password";
import { signSession, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { loginFormSchema } from "@/lib/validation/auth";
import { prisma } from "@/lib/prisma";

const logoutSchema = z.object({ redirectTo: z.string().optional() }).strict();

export async function loginAction(formData: FormData) {
  const raw = {
    kind: String(formData.get("kind") ?? ""),
    password: String(formData.get("password") ?? ""),
    coachId: formData.get("coachId")
      ? String(formData.get("coachId"))
      : undefined,
  };
  if (raw.kind !== "SUPER_ADMIN" && raw.kind !== "COACH") {
    throw new Error("Invalid role");
  }
  const parsed = loginFormSchema.safeParse({
    kind: raw.kind,
    password: raw.password,
    coachId: raw.coachId,
  });
  if (!parsed.success) {
    throw new Error("Check your inputs");
  }
  const v = verifySharedPassword({
    kind: parsed.data.kind,
    password: parsed.data.password,
  });
  if (!v.ok) {
    throw new Error(v.reason);
  }
  if (parsed.data.kind === "COACH") {
    if (!parsed.data.coachId) {
      throw new Error("Select your coach");
    }
    try {
      await assertCoachActive(parsed.data.coachId);
    } catch {
      throw new Error("Invalid coach");
    }
    const token = await signSession({ role: "COACH", coachId: parsed.data.coachId });
    await setSessionCookie(token);
  } else {
    const token = await signSession({ role: "SUPER_ADMIN", coachId: null });
    await setSessionCookie(token);
  }
  revalidatePath("/");
  redirect("/teams");
}

export async function logoutAction(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") ?? "/login");
  logoutSchema.parse({ redirectTo });
  await clearSessionCookie();
  revalidatePath("/");
  redirect(redirectTo);
}

export async function listActiveCoaches() {
  return await prisma.coach.findMany({
    where: { isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      staffRoleLabel: true,
      primaryAreaLabel: true,
      primaryLocation: { select: { name: true } },
    },
  });
}
