import Link from "next/link";
import type { SessionPayload } from "@/lib/auth/types";
import { logoutAction } from "@/app/actions/auth";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

function roleLabel(session: SessionPayload) {
  if (session.role === "SUPER_ADMIN") return "Super admin";
  return "Coach";
}

export async function AppNav({ session }: { session: SessionPayload }) {
  let label = roleLabel(session);
  if (isCoachSession(session)) {
    const c = await prisma.coach.findFirst({
      where: { id: session.coachId },
      select: { firstName: true, lastName: true },
    });
    if (c) {
      label = `Coach: ${c.firstName} ${c.lastName}`;
    }
  }
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/teams" className="font-semibold text-slate-900">
            Club tracker
          </Link>
          <span className="text-sm text-slate-600">{label}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link className="text-slate-800" href="/teams">
            Teams
          </Link>
          <Link className="text-slate-800" href="/players">
            Players
          </Link>
          <form action={logoutAction}>
            <input type="hidden" name="redirectTo" value="/login" />
            <button
              className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-800 hover:bg-slate-50"
              type="submit"
            >
              Log out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
