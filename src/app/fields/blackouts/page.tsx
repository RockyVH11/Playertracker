import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import {
  createFieldBlackoutAction,
  deleteFieldBlackoutAction,
} from "@/app/actions/field-blackouts";
import { formatYmdLocal } from "@/lib/fields/local-date";
import { prisma } from "@/lib/prisma";
import {
  canManageFieldComplexesForLocation,
  mayAccessFieldInfrastructureAdmin,
} from "@/lib/rbac-fields";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ error?: string; locationId?: string }> };

function asString(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  return undefined;
}

function blackoutRangeLabel(b: {
  startTime: string | null;
  endTime: string | null;
}): string {
  if (b.startTime == null && b.endTime == null) return "All day";
  if (b.startTime && b.endTime) return `${b.startTime}–${b.endTime}`;
  return "All day";
}

export default async function FieldBlackoutsPage({ searchParams }: Props) {
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
  const error = typeof sp.error === "string" ? decodeURIComponent(sp.error) : null;
  const requestedLoc = asString(sp.locationId)?.trim();

  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const hasValidLocationParam = Boolean(
    requestedLoc && locations.some((l) => l.id === requestedLoc)
  );

  let selectedLocationId: string | null = null;
  if (session.role === "SUPER_ADMIN") {
    selectedLocationId = hasValidLocationParam ? requestedLoc! : null;
  } else {
    selectedLocationId = primaryLocationId;
  }

  const noPrimary =
    session.role !== "SUPER_ADMIN" && !primaryLocationId ? (
      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Set a primary location on your staff profile before managing blackouts.
      </p>
    ) : null;

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

  const todayYmd = formatYmdLocal(new Date());

  const loaded =
    selectedLocationId != null
      ? await Promise.all([
          prisma.complex.findMany({
            where: { locationId: selectedLocationId, isActive: true },
            include: {
              fields: { where: { isActive: true }, orderBy: { name: "asc" } },
            },
            orderBy: { name: "asc" },
          }),
          prisma.fieldBlackout.findMany({
            where: { complex: { locationId: selectedLocationId } },
            include: {
              complex: { select: { name: true } },
              field: { select: { name: true } },
            },
            orderBy: [{ blackoutDate: "desc" }, { complexId: "asc" }],
          }),
        ])
      : null;

  const complexesWithFields = loaded?.[0] ?? [];
  const blackouts = loaded?.[1] ?? [];

  const activeLocationName =
    selectedLocationId != null
      ? locations.find((l) => l.id === selectedLocationId)?.name ?? "Unknown location"
      : null;

  const showSuperAdminGate = session.role === "SUPER_ADMIN" && selectedLocationId == null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Field blackouts</h1>
        <p className="mt-1 text-sm text-slate-600">
          Block windows on the schedule (weather closures, tournaments). The grid shows blackouts
          over assignments; remove assignments separately if needed.
        </p>
      </div>

      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </p>
      ) : null}
      {noPrimary}

      {showSuperAdminGate ? (
        <div className="space-y-4 rounded border border-slate-200 bg-white p-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Choose location</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pick the site whose complexes you want to manage blackouts for.
            </p>
          </div>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="min-w-[200px] flex-1">
              <label className="block text-xs font-medium text-slate-700" htmlFor="loc-pick">
                Location
              </label>
              <select
                id="loc-pick"
                name="locationId"
                required
                className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Select…
                </option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Continue
            </button>
          </form>
        </div>
      ) : null}

      {selectedLocationId != null && activeLocationName ? (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-slate-700">
              <span className="font-medium">{activeLocationName}</span>
            </p>
            {session.role === "SUPER_ADMIN" ? (
              <Link
                className="text-sm text-slate-700 underline hover:text-slate-900"
                href="/fields/blackouts"
              >
                Switch location
              </Link>
            ) : null}
          </div>

          {complexesWithFields.length === 0 ? (
            <p className="text-sm text-slate-600">
              No active complexes yet. Add them under{" "}
              <Link href="/fields/complexes" className="underline">
                Field setup
              </Link>
              .
            </p>
          ) : (
            <section className="rounded border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">Add blackout</h2>
              <form action={createFieldBlackoutAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="locationId" value={selectedLocationId} />
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700" htmlFor="complexId">
                    Complex
                  </label>
                  <select
                    id="complexId"
                    name="complexId"
                    required
                    className="rounded border border-slate-300 px-2 py-2 text-sm"
                    defaultValue={complexesWithFields[0]?.id}
                  >
                    {complexesWithFields.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700" htmlFor="fieldId">
                    Field (optional — leave blank for entire complex)
                  </label>
                  <select
                    id="fieldId"
                    name="fieldId"
                    className="rounded border border-slate-300 px-2 py-2 text-sm"
                    defaultValue=""
                  >
                    <option value="">All fields at complex</option>
                    {complexesWithFields.map((c) => (
                      <optgroup key={c.id} label={c.name}>
                        {c.fields.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700" htmlFor="blackoutDate">
                    Date
                  </label>
                  <input
                    id="blackoutDate"
                    name="blackoutDate"
                    type="date"
                    required
                    defaultValue={todayYmd}
                    className="rounded border border-slate-300 px-2 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-700">Time window</span>
                  <p className="text-xs text-slate-500">
                    Leave both blank for all day; otherwise use 24-hour times.
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700" htmlFor="startTime">
                    Start
                  </label>
                  <input
                    id="startTime"
                    name="startTime"
                    placeholder="18:00"
                    className="rounded border border-slate-300 px-2 py-2 font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700" htmlFor="endTime">
                    End
                  </label>
                  <input
                    id="endTime"
                    name="endTime"
                    placeholder="21:00"
                    className="rounded border border-slate-300 px-2 py-2 font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700" htmlFor="reason">
                    Reason (optional)
                  </label>
                  <input
                    id="reason"
                    name="reason"
                    maxLength={500}
                    className="rounded border border-slate-300 px-2 py-2 text-sm"
                    placeholder="e.g. Lightning policy — fields closed"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Save blackout
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="rounded border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Scheduled blackouts</h2>
            {blackouts.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">None yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200 rounded border border-slate-200 bg-white">
                {blackouts.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {b.complex.name}
                        {b.field ? ` — ${b.field.name}` : " — all fields"}
                      </div>
                      <div className="text-xs text-slate-600">
                        {b.blackoutDate.toISOString().slice(0, 10)} · {blackoutRangeLabel(b)}
                      </div>
                      {b.reason ? (
                        <div className="mt-1 text-xs text-slate-700">{b.reason}</div>
                      ) : null}
                    </div>
                    <form action={deleteFieldBlackoutAction}>
                      <input type="hidden" name="blackoutId" value={b.id} />
                      <input type="hidden" name="locationId" value={selectedLocationId} />
                      <button
                        type="submit"
                        className="text-xs text-red-700 underline hover:text-red-900"
                      >
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-xs text-slate-500">
            Open the{" "}
            <Link href={`/fields/schedule?locationId=${encodeURIComponent(selectedLocationId)}`}>
              schedule grid
            </Link>{" "}
            to see blackouts on the day.
          </p>
        </>
      ) : null}
    </div>
  );
}
