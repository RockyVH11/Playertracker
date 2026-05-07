import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import {
  canManageFieldComplexesForLocation,
  mayAccessFieldInfrastructureAdmin,
} from "@/lib/rbac-fields";
import { createComplexAction } from "@/app/actions/field-complexes";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ error?: string; locationId?: string }> };

function asString(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  return undefined;
}

export default async function FieldComplexesPage({ searchParams }: Props) {
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

  /** Super admin must open this page with ?locationId= after choosing a location (no silent default). */
  let selectedLocationId: string | null = null;
  if (session.role === "SUPER_ADMIN") {
    selectedLocationId = hasValidLocationParam ? requestedLoc! : null;
  } else {
    selectedLocationId = primaryLocationId;
  }

  const noPrimary =
    session.role !== "SUPER_ADMIN" && !primaryLocationId ? (
      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Set a primary location on your staff profile before managing complexes.
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

  const activeLocationName =
    selectedLocationId != null
      ? locations.find((l) => l.id === selectedLocationId)?.name ?? "Unknown location"
      : null;

  const complexes =
    selectedLocationId != null
      ? await prisma.complex.findMany({
          where: { locationId: selectedLocationId },
          orderBy: { name: "asc" },
          include: { _count: { select: { fields: true } } },
        })
      : [];

  const showSuperAdminGate = session.role === "SUPER_ADMIN" && selectedLocationId == null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Field complexes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create complexes and fields for a location. Deactivate instead of delete to preserve
          history.
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
            <h2 className="text-sm font-semibold text-slate-900">Step 1 — Choose location</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pick the city or site you are configuring. You will add complexes on the next screen
              only after this is locked in.
            </p>
          </div>
          {locations.length === 0 ? (
            <p className="text-sm text-slate-600">No locations exist yet. Add one under Admin.</p>
          ) : (
            <form className="flex flex-wrap items-end gap-3" method="get" action="/fields/complexes">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-700" htmlFor="loc">
                  Location
                </label>
                <select
                  id="loc"
                  name="locationId"
                  required
                  defaultValue=""
                  className="min-w-[240px] rounded border border-slate-300 px-2 py-2 text-sm"
                >
                  <option value="" disabled>
                    Select a location…
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
          )}
        </div>
      ) : null}

      {selectedLocationId && activeLocationName ? (
        <div className="rounded border border-sky-200 bg-sky-50 px-4 py-3">
          <p className="text-sm text-sky-950">
            <span className="font-medium text-sky-900">Managing location</span>
            {": "}
            <span className="text-lg font-bold text-sky-950">{activeLocationName}</span>
          </p>
          {session.role === "SUPER_ADMIN" ? (
            <p className="mt-2 text-sm">
              <Link
                href="/fields/complexes"
                className="font-medium text-sky-900 underline underline-offset-2 hover:text-sky-800"
              >
                Switch location
              </Link>
              <span className="text-sky-800"> — returns to location selection</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {selectedLocationId ? (
        <>
          <section className="rounded border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Add a complex</h2>
            <p className="mt-1 text-xs text-slate-600">
              New complexes and fields are created under{" "}
              <span className="font-semibold text-slate-800">{activeLocationName}</span>.
            </p>
            <form
              action={createComplexAction}
              className="mt-3 flex max-w-xl flex-wrap items-end gap-2"
            >
              <input type="hidden" name="locationId" value={selectedLocationId} />
              <div className="flex min-w-[180px] flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-slate-700" htmlFor="name">
                  Complex name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  className="rounded border border-slate-300 px-2 py-2 text-sm"
                  placeholder='e.g. "Boneyard"'
                />
              </div>
              <div className="flex min-w-[200px] flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-slate-700" htmlFor="notes">
                  Notes (optional)
                </label>
                <input
                  id="notes"
                  name="notes"
                  className="rounded border border-slate-300 px-2 py-2 text-sm"
                  placeholder="Parking, lights, …"
                />
              </div>
              <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Add complex
              </button>
            </form>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Complexes</h2>
            {complexes.length === 0 ? (
              <p className="text-sm text-slate-600">No complexes yet for this location.</p>
            ) : (
              <table className="w-full border-collapse border border-slate-200 bg-white text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="border-b border-slate-200 px-2 py-2">Complex</th>
                    <th className="border-b border-slate-200 px-2 py-2 text-right">
                      Fields
                    </th>
                    <th className="border-b border-slate-200 px-2 py-2">Status</th>
                    <th className="border-b border-slate-200 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {complexes.map((c) => (
                    <tr key={c.id} className={c.isActive ? "" : "bg-slate-50 text-slate-500"}>
                      <td className="border-b border-slate-100 px-2 py-2 font-medium">{c.name}</td>
                      <td className="border-b border-slate-100 px-2 py-2 text-right tabular-nums">
                        {c._count.fields}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2">
                        {c.isActive ? "Active" : "Inactive"}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-2 text-right">
                        <Link
                          href={`/fields/complexes/${c.id}`}
                          className="text-slate-900 underline underline-offset-2 hover:text-slate-700"
                        >
                          Manage fields
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
