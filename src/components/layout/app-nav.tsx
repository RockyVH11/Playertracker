import Link from "next/link";
import type { StaffRole } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { logoutAction } from "@/app/actions/auth";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import { StormLogoLink } from "@/components/layout/storm-logo";

function roleLabel(session: SessionPayload) {
  if (session.role === "SUPER_ADMIN") return "Super admin";
  return "Coach";
}

export async function AppNav({ session }: { session: SessionPayload | null }) {
  if (!session) {
    return (
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-6">
          <StormLogoLink href="/login" />
        </div>
      </header>
    );
  }

  let label = roleLabel(session);
  let staffRole: StaffRole | null | undefined;
  if (isCoachSession(session)) {
    const c = await prisma.coach.findFirst({
      where: { id: session.coachId },
      select: { firstName: true, lastName: true, staffRole: true },
    });
    staffRole = c?.staffRole;
    if (c) {
      label = `Staff: ${c.firstName} ${c.lastName}`;
    }
  }

  const showProspectDashboard =
    session.role === "SUPER_ADMIN" || staffRole === "DIRECTOR";
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <StormLogoLink href="/teams" />
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <Link href="/teams" className="font-semibold text-slate-900 whitespace-nowrap">
              Club tracker
            </Link>
            <span className="truncate text-sm text-slate-600">{label}</span>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link className="text-slate-800" href="/dashboard">
            Dashboard
          </Link>
          <Link className="text-slate-800" href="/teams">
            Teams
          </Link>
          <Link className="text-slate-800" href="/players">
            Players
          </Link>
          <Link className="text-slate-800" href="/staff">
            Staff
          </Link>
          {session.role !== "SUPER_ADMIN" ? (
            <Link className="text-slate-800" href="/prospects/new">
              Add prospect
            </Link>
          ) : null}
          {showProspectDashboard ? (
            <Link className="text-slate-800" href="/prospects">
              Prospects board
            </Link>
          ) : null}
          {session.role === "SUPER_ADMIN" ? (
            <Link className="text-slate-800" href="/admin/locations">
              Admin
            </Link>
          ) : null}
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
