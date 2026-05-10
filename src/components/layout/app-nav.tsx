import Link from "next/link";
import type { StaffRole } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth/types";
import { logoutAction } from "@/app/actions/auth";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import {
  canAccessFieldRequestsBoard,
  mayAccessEquipment,
  maySubmitFieldTimeRequest,
} from "@/lib/rbac-fields";
import { FieldsSubmenu } from "@/components/layout/fields-submenu";
import { NavDropdown } from "@/components/layout/nav-dropdown";
import { directorPendingRequestsTotal } from "@/lib/nav/director-pending-counts";
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
  let primaryLocationId: string | null = null;
  if (isCoachSession(session)) {
    const c = await prisma.coach.findFirst({
      where: { id: session.coachId },
      select: { firstName: true, lastName: true, staffRole: true, primaryLocationId: true },
    });
    staffRole = c?.staffRole;
    primaryLocationId = c?.primaryLocationId ?? null;
    if (c) {
      label = `Staff: ${c.firstName} ${c.lastName}`;
    }
  }

  const showProspectDashboard =
    session.role === "SUPER_ADMIN" || staffRole === "DIRECTOR";
  const showFieldInfrastructure =
    session.role === "SUPER_ADMIN" || staffRole === "DIRECTOR";
  const showFieldRequestsBoard = canAccessFieldRequestsBoard(
    session,
    staffRole ?? null
  );
  const showRequestFieldTime =
    isCoachSession(session) && maySubmitFieldTimeRequest(session, staffRole ?? null);
  const showEquipment = mayAccessEquipment(session, staffRole ?? null);
  const showAddProspect = session.role !== "SUPER_ADMIN";
  const showProspectsMenu = showAddProspect || showProspectDashboard;
  const pendingNav = showFieldRequestsBoard
    ? await directorPendingRequestsTotal(prisma, session, staffRole ?? null, primaryLocationId)
    : { total: 0, fieldRequests: 0, equipmentRequests: 0 };
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
          <NavDropdown
            label="Dashboard"
            summaryClassName="cursor-pointer list-none text-slate-800 hover:text-slate-950 [&::-webkit-details-marker]:hidden"
            panelClassName="absolute left-0 top-full z-50 mt-1 min-w-[14rem] rounded-md border border-slate-200 bg-white py-1 shadow-md"
          >
            <Link className="block px-3 py-2 text-slate-800 hover:bg-slate-50" href="/dashboard">
              Club Dashboard
            </Link>
            <Link className="block px-3 py-2 text-slate-800 hover:bg-slate-50" href="/dashboard/team-building">
              Team Building Dashboard
            </Link>
          </NavDropdown>
          <Link className="text-slate-800 hover:text-slate-950" href="/teams">
            My Team
          </Link>
          <NavDropdown
            label="Club"
            summaryClassName="cursor-pointer list-none text-slate-800 hover:text-slate-950 [&::-webkit-details-marker]:hidden"
            panelClassName="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-md border border-slate-200 bg-white py-1 shadow-md"
          >
              <Link className="block px-3 py-2 text-slate-800 hover:bg-slate-50" href="/teams">
                Teams
              </Link>
              <Link className="block px-3 py-2 text-slate-800 hover:bg-slate-50" href="/players">
                Players
              </Link>
              <Link className="block px-3 py-2 text-slate-800 hover:bg-slate-50" href="/staff">
                Staff
              </Link>
          </NavDropdown>
          {showProspectsMenu ? (
            <NavDropdown
              label="Prospects"
              summaryClassName="cursor-pointer list-none text-slate-800 hover:text-slate-950 [&::-webkit-details-marker]:hidden"
              panelClassName="absolute left-0 top-full z-50 mt-1 min-w-[11rem] rounded-md border border-slate-200 bg-white py-1 shadow-md"
            >
                {showAddProspect ? (
                  <Link
                    className="block px-3 py-2 text-slate-800 hover:bg-slate-50"
                    href="/prospects/new"
                  >
                    Add prospect
                  </Link>
                ) : null}
                {showProspectDashboard ? (
                  <Link className="block px-3 py-2 text-slate-800 hover:bg-slate-50" href="/prospects">
                    Prospects board
                  </Link>
                ) : null}
            </NavDropdown>
          ) : null}
          {showFieldInfrastructure ? (
            <FieldsSubmenu showEquipment={showEquipment} variant="toolbar" />
          ) : null}
          {!showFieldInfrastructure && showEquipment ? (
            <Link className="text-slate-800" href="/fields/equipment">
              Equipment
            </Link>
          ) : null}
          {showFieldRequestsBoard ? (
            <Link className="text-slate-800" href="/fields/requests">
              Pending requests ({pendingNav.total})
            </Link>
          ) : null}
          {showRequestFieldTime ? (
            <Link className="text-slate-800" href="/fields/requests/new">
              Request field
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
