import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardRollupPanel } from "@/components/fields/dashboard-rollup-panel";
import { rollupFieldDashboardForDays } from "@/lib/fields/field-dashboard-rollup";
import {
  daysInCalendarMonthContaining,
  daysInWeekStartingSundayContaining,
  formatYmdLocal,
  parseYmdLocal,
  startOfWeekSunday,
} from "@/lib/fields/local-date";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import {
  canManageFieldComplexesForLocation,
  mayAccessFieldInfrastructureAdmin,
} from "@/lib/rbac-fields";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ locationId?: string; date?: string }>;
};

function asString(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  return undefined;
}

export default async function FieldDashboardPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  let viewerStaffRole: import("@prisma/client").StaffRole | null = null;
  let primaryLocationId: string | null = null;
  if (session.role !== "SUPER_ADMIN") {
    if (!isCoachSession(session)) redirect("/login");
    const row = await prisma.coach.findFirst({
      where: { id: session.coachId, isActive: true },
      select: { staffRole: true, primaryLocationId: true },
    });
    if (!row) redirect("/login");
    viewerStaffRole = row.staffRole;
    primaryLocationId = row.primaryLocationId;
    if (!mayAccessFieldInfrastructureAdmin(session, viewerStaffRole)) redirect("/teams");
  }

  const sp = (await searchParams) ?? {};
  const requestedLoc = asString(sp.locationId)?.trim();
  const requestedDate = asString(sp.date)?.trim();

  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  let selectedLocationId: string | null = null;
  if (session.role === "SUPER_ADMIN") {
    selectedLocationId =
      requestedLoc && locations.some((l) => l.id === requestedLoc) ? requestedLoc : null;
  } else {
    selectedLocationId = primaryLocationId;
  }

  if (
    selectedLocationId &&
    !canManageFieldComplexesForLocation(
      session,
      viewerStaffRole,
      primaryLocationId,
      selectedLocationId
    )
  ) {
    redirect("/teams");
  }

  const anchor =
    requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? parseYmdLocal(requestedDate)
      : new Date();

  const dateParam = formatYmdLocal(anchor);
  const weekDays = daysInWeekStartingSundayContaining(anchor);
  const monthDays = daysInCalendarMonthContaining(anchor);
  const weekStart = weekDays[0]!;
  const weekEnd = weekDays[6]!;
  const monthStart = monthDays[0]!;
  const monthEnd = monthDays[monthDays.length - 1]!;

  const weekRollup =
    selectedLocationId != null
      ? await rollupFieldDashboardForDays(selectedLocationId, weekDays)
      : null;
  const monthRollup =
    selectedLocationId != null
      ? await rollupFieldDashboardForDays(selectedLocationId, monthDays)
      : null;

  const locationRow = locations.find((l) => l.id === selectedLocationId);
  const locationName = locationRow?.name ?? "Location";

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Field usage</h1>
        <p className="mt-1 text-sm text-slate-600">
          Capacity comes from published availability windows (same hull as the schedule grid),
          minus blackouts. Scheduled hours sum assignment lengths for the period.
        </p>
      </div>

      {session.role === "SUPER_ADMIN" && selectedLocationId == null ? (
        <form className="space-y-3 rounded border border-slate-200 bg-white p-4" method="get">
          <input type="hidden" name="date" value={dateParam} />
          <label className="block text-xs font-medium text-slate-700" htmlFor="loc">
            Location
          </label>
          <select
            id="loc"
            name="locationId"
            required
            className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select location…
            </option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Continue
          </button>
        </form>
      ) : null}

      {session.role === "SUPER_ADMIN" && selectedLocationId != null ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            className="text-slate-700 underline hover:text-slate-900"
            href="/fields/dashboard"
          >
            Switch location
          </Link>
        </div>
      ) : null}

      {session.role !== "SUPER_ADMIN" && !primaryLocationId ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Set a primary location on your staff profile to view field usage.
        </p>
      ) : null}

      {selectedLocationId != null && weekRollup && monthRollup ? (
        <>
          <form
            className="flex flex-wrap items-end gap-3 rounded border border-slate-200 bg-slate-50 p-3"
            method="get"
          >
            <input type="hidden" name="locationId" value={selectedLocationId} />
            <div className="flex flex-col gap-1">
              <label htmlFor="dash-date" className="text-xs font-medium text-slate-700">
                Anchor date
              </label>
              <input
                id="dash-date"
                name="date"
                type="date"
                defaultValue={dateParam}
                className="rounded border border-slate-300 px-2 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Apply
            </button>
            <p className="text-xs text-slate-500">
              Week = Sunday–Saturday containing the anchor; month = full calendar month containing
              the anchor.
            </p>
          </form>

          <p className="text-sm text-slate-700">
            <span className="font-medium">{locationName}</span>
          </p>

          <DashboardRollupPanel
            title="Week view"
            rangeDescription={`${formatYmdLocal(weekStart)} → ${formatYmdLocal(weekEnd)} (week of ${formatYmdLocal(startOfWeekSunday(anchor))})`}
            rollup={weekRollup}
          />

          <DashboardRollupPanel
            title="Month view"
            rangeDescription={`${formatYmdLocal(monthStart)} → ${formatYmdLocal(monthEnd)} (${anchor.toLocaleString("en-US", { month: "long", year: "numeric" })})`}
            rollup={monthRollup}
          />

          <p className="text-xs text-slate-500">
            Cross-check with the{" "}
            <Link href={`/fields/schedule?locationId=${encodeURIComponent(selectedLocationId)}&date=${encodeURIComponent(dateParam)}`}>
              schedule grid
            </Link>{" "}
            for the same anchor date.
          </p>
        </>
      ) : null}
    </div>
  );
}
