import Link from "next/link";
import { redirect } from "next/navigation";
import { EquipmentReservationStatus } from "@prisma/client";
import {
  cancelEquipmentReservationAction,
  createEquipmentReservationAction,
} from "@/app/actions/equipment-reservations";
import {
  createEquipmentItemAction,
  updateEquipmentItemAction,
} from "@/app/actions/equipment-items";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { formatYmdLocal } from "@/lib/fields/local-date";
import { prisma } from "@/lib/prisma";
import {
  canManageFieldComplexesForLocation,
  mayAccessEquipment,
  mayAccessFieldInfrastructureAdmin,
  maySubmitFieldTimeRequest,
} from "@/lib/rbac-fields";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    locationId?: string;
    error?: string;
    assignmentId?: string;
  }>;
};

function asString(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  return undefined;
}

export default async function FieldEquipmentPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  let viewerStaffRole: import("@prisma/client").StaffRole | null = null;
  let primaryLocationId: string | null = null;
  if (session.role !== "SUPER_ADMIN" && isCoachSession(session)) {
    const row = await prisma.coach.findFirst({
      where: { id: session.coachId, isActive: true },
      select: { staffRole: true, primaryLocationId: true },
    });
    viewerStaffRole = row?.staffRole ?? null;
    primaryLocationId = row?.primaryLocationId ?? null;
  }

  const canManageItems =
    session.role === "SUPER_ADMIN" ||
    mayAccessFieldInfrastructureAdmin(session, viewerStaffRole);

  if (!mayAccessEquipment(session, viewerStaffRole)) redirect("/teams");

  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? decodeURIComponent(sp.error) : null;
  const requestedLoc = asString(sp.locationId)?.trim();
  const assignmentIdParam = asString(sp.assignmentId)?.trim();

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

  if (selectedLocationId) {
    const canAccessLocation =
      session.role === "SUPER_ADMIN" ||
      canManageFieldComplexesForLocation(
        session,
        viewerStaffRole,
        primaryLocationId,
        selectedLocationId
      ) ||
      (isCoachSession(session) &&
        maySubmitFieldTimeRequest(session, viewerStaffRole ?? null) &&
        primaryLocationId === selectedLocationId);
    if (!canAccessLocation) redirect("/teams");
  }

  const coachOnlyReserve =
    isCoachSession(session) &&
    !mayAccessFieldInfrastructureAdmin(session, viewerStaffRole);

  const teams =
    selectedLocationId != null && isCoachSession(session)
      ? await prisma.team.findMany({
          where: {
            locationId: selectedLocationId,
            ...(coachOnlyReserve ? { coachId: session.coachId } : {}),
          },
          orderBy: { teamName: "asc" },
          select: { id: true, teamName: true, seasonLabel: true },
        })
      : selectedLocationId != null
        ? await prisma.team.findMany({
            where: { locationId: selectedLocationId },
            orderBy: { teamName: "asc" },
            select: { id: true, teamName: true, seasonLabel: true },
          })
        : [];

  let prefill: {
    teamId: string;
    reservationDate: string;
    startTime: string;
    endTime: string;
    linkedFieldAssignmentId: string;
  } | null = null;

  if (selectedLocationId && assignmentIdParam) {
    const fa = await prisma.fieldAssignment.findFirst({
      where: {
        id: assignmentIdParam,
        field: { complex: { locationId: selectedLocationId } },
      },
      select: {
        teamId: true,
        assignmentDate: true,
        startTime: true,
        endTime: true,
      },
    });
    if (fa) {
      prefill = {
        teamId: fa.teamId,
        reservationDate: formatYmdLocal(fa.assignmentDate),
        startTime: fa.startTime,
        endTime: fa.endTime,
        linkedFieldAssignmentId: assignmentIdParam,
      };
    }
  }

  const defaultReserveDate = formatYmdLocal(new Date());

  const [items, reservations] =
    selectedLocationId != null
      ? await Promise.all([
          prisma.equipmentItem.findMany({
            where: { locationId: selectedLocationId },
            orderBy: { name: "asc" },
          }),
          prisma.equipmentReservation.findMany({
            where: {
              equipmentItem: { locationId: selectedLocationId },
              status: EquipmentReservationStatus.ACTIVE,
            },
            include: {
              equipmentItem: { select: { name: true } },
              team: { select: { teamName: true } },
              reservedByCoach: { select: { firstName: true, lastName: true } },
            },
            orderBy: [{ reservationDate: "desc" }, { startTime: "desc" }],
            take: 80,
          }),
        ])
      : [[], []];

  const locationName =
    selectedLocationId != null
      ? locations.find((l) => l.id === selectedLocationId)?.name
      : null;

  const showLocPicker = session.role === "SUPER_ADMIN" && selectedLocationId == null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Field equipment</h1>
        <p className="mt-1 text-sm text-slate-600">
          Reserve goals, poles, or other shared gear. Set a pool size on each item (how many
          identical units can overlap in time). Use quantity on a booking to take several at once
          (e.g. four small goals in one session). Coaches book within the current week unless you
          are a director or super admin.
        </p>
      </div>

      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </p>
      ) : null}

      {showLocPicker ? (
        <form className="space-y-3 rounded border border-slate-200 bg-white p-4" method="get">
          {assignmentIdParam ? (
            <input type="hidden" name="assignmentId" value={assignmentIdParam} />
          ) : null}
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

      {selectedLocationId != null && session.role === "SUPER_ADMIN" ? (
        <p className="text-sm">
          <Link className="text-slate-700 underline" href="/fields/equipment">
            Switch location
          </Link>
        </p>
      ) : null}

      {session.role !== "SUPER_ADMIN" && !primaryLocationId ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Set a primary location on your staff profile to view equipment.
        </p>
      ) : null}

      {selectedLocationId != null && locationName ? (
        <>
          <p className="text-sm font-medium text-slate-800">{locationName}</p>

          {canManageItems ? (
            <section className="rounded border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">Equipment catalog</h2>
              <form action={createEquipmentItemAction} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="locationId" value={selectedLocationId} />
                <input
                  name="name"
                  required
                  placeholder="Name (e.g. Portable goals)"
                  className="min-w-[200px] flex-1 rounded border border-slate-300 px-2 py-2 text-sm"
                />
                <input
                  name="description"
                  placeholder="Notes (optional)"
                  className="min-w-[200px] flex-1 rounded border border-slate-300 px-2 py-2 text-sm"
                />
                <label className="flex flex-col gap-0.5 text-xs text-slate-600">
                  Pool (max out at once)
                  <input
                    name="concurrentCapacity"
                    type="number"
                    min={1}
                    max={99}
                    defaultValue={4}
                    className="w-20 rounded border border-slate-300 px-2 py-2 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Add item
                </button>
              </form>

              {items.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">No equipment yet — add an item above.</p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-200 border border-slate-200">
                  {items.map((it) => (
                    <li key={it.id} className="flex flex-wrap items-start justify-between gap-3 px-3 py-3">
                      <div>
                        <div className="font-medium text-slate-900">{it.name}</div>
                        {it.description ? (
                          <div className="text-xs text-slate-600">{it.description}</div>
                        ) : null}
                        <div className="text-xs text-slate-500">
                          Pool {it.concurrentCapacity} · {it.isActive ? "Active" : "Inactive"}
                        </div>
                      </div>
                      <form action={updateEquipmentItemAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="equipmentItemId" value={it.id} />
                        <input type="hidden" name="locationId" value={selectedLocationId} />
                        <input
                          name="name"
                          defaultValue={it.name}
                          className="w-40 rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                        <input
                          name="description"
                          defaultValue={it.description ?? ""}
                          placeholder="Notes"
                          className="w-44 rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                        <label className="flex flex-col gap-0.5 text-[10px] text-slate-600">
                          Pool
                          <input
                            name="concurrentCapacity"
                            type="number"
                            min={1}
                            max={99}
                            defaultValue={it.concurrentCapacity}
                            className="w-14 rounded border border-slate-300 px-1 py-1 text-xs"
                          />
                        </label>
                        <label className="flex items-center gap-1 text-xs text-slate-700">
                          <input type="checkbox" name="isActive" defaultChecked={it.isActive} />
                          Active
                        </label>
                        <button
                          type="submit"
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Save
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <section className="rounded border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold text-slate-900">New reservation</h2>
            {items.filter((i) => i.isActive).length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                {canManageItems
                  ? "Add equipment above before reserving."
                  : "No active equipment at this location yet."}
              </p>
            ) : teams.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No teams available for your account.</p>
            ) : (
              <form action={createEquipmentReservationAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="locationId" value={selectedLocationId} />
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700" htmlFor="equipmentItemId">
                    Equipment
                  </label>
                  <select
                    id="equipmentItemId"
                    name="equipmentItemId"
                    required
                    className="rounded border border-slate-300 px-2 py-2 text-sm"
                    defaultValue={items.find((i) => i.isActive)?.id ?? ""}
                  >
                    {items
                      .filter((i) => i.isActive)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} (pool {i.concurrentCapacity})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700" htmlFor="teamId">
                    Team
                  </label>
                  <select
                    id="teamId"
                    name="teamId"
                    required
                    defaultValue={prefill?.teamId ?? teams[0]?.id}
                    className="rounded border border-slate-300 px-2 py-2 text-sm"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamName} ({t.seasonLabel})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700" htmlFor="reservationDate">
                    Date
                  </label>
                  <input
                    id="reservationDate"
                    name="reservationDate"
                    type="date"
                    required
                    defaultValue={prefill?.reservationDate ?? defaultReserveDate}
                    className="rounded border border-slate-300 px-2 py-2 text-sm"
                  />
                </div>
                <input
                  type="hidden"
                  name="linkedFieldAssignmentId"
                  value={prefill?.linkedFieldAssignmentId ?? ""}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700" htmlFor="startTime">
                    Start
                  </label>
                  <input
                    id="startTime"
                    name="startTime"
                    required
                    defaultValue={prefill?.startTime ?? "18:00"}
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
                    required
                    defaultValue={prefill?.endTime ?? "19:00"}
                    className="rounded border border-slate-300 px-2 py-2 font-mono text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700" htmlFor="quantity">
                    Quantity
                  </label>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min={1}
                    max={99}
                    defaultValue={1}
                    required
                    className="rounded border border-slate-300 px-2 py-2 text-sm"
                  />
                  <span className="text-[11px] text-slate-500">
                    Units from this item&apos;s pool for this session.
                  </span>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700" htmlFor="notes">
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    className="rounded border border-slate-300 px-2 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Reserve
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="rounded border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">Active reservations</h2>
            {reservations.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">None right now.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {reservations.map((r) => {
                  const showCancel =
                    session.role === "SUPER_ADMIN" ||
                    canManageFieldComplexesForLocation(
                      session,
                      viewerStaffRole,
                      primaryLocationId,
                      selectedLocationId
                    ) ||
                    (isCoachSession(session) && r.reservedByCoachId === session.coachId);
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium text-slate-900">
                          {r.equipmentItem.name}{" "}
                          <span className="font-normal text-slate-600">(×{r.quantity})</span>
                        </div>
                        <div className="text-slate-600">
                          {r.team.teamName} · {formatYmdLocal(r.reservationDate)} · {r.startTime}–
                          {r.endTime}
                        </div>
                        <div className="text-xs text-slate-500">
                          Booked by {r.reservedByCoach.firstName} {r.reservedByCoach.lastName}
                        </div>
                        {r.notes ? <div className="text-xs text-slate-600">{r.notes}</div> : null}
                      </div>
                      {showCancel ? (
                        <form action={cancelEquipmentReservationAction}>
                          <input type="hidden" name="reservationId" value={r.id} />
                          <input type="hidden" name="locationId" value={selectedLocationId} />
                          <button
                            type="submit"
                            className="text-xs text-red-700 underline hover:text-red-900"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <p className="text-xs text-slate-500">
            <Link href={`/fields/schedule?locationId=${encodeURIComponent(selectedLocationId)}`}>
              Back to schedule
            </Link>
          </p>
        </>
      ) : null}
    </div>
  );
}
