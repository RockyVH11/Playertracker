import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import {
  canManageFieldComplexesForLocation,
  mayAccessFieldInfrastructureAdmin,
} from "@/lib/rbac-fields";
import {
  createAvailabilityWindowAction,
  createFieldAvailabilityWindowAction,
  updateAvailabilityWindowAction,
  updateFieldAvailabilityWindowAction,
} from "@/app/actions/field-availability";
import {
  createFieldAction,
  updateComplexAction,
  updateFieldAction,
} from "@/app/actions/field-complexes";
import { DAY_OF_WEEK_ORDER, dayOfWeekLabel } from "@/lib/fields/day-of-week-order";
import { DayOfWeek } from "@prisma/client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ complexId: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function FieldComplexDetailPage({ params, searchParams }: Props) {
  const { complexId } = await params;
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

  const complex = await prisma.complex.findFirst({
    where: { id: complexId },
    include: {
      location: { select: { id: true, name: true } },
      fields: { include: { availabilityWindows: true }, orderBy: { name: "asc" } },
      availabilityWindows: true,
    },
  });
  if (!complex) redirect("/fields/complexes");

  if (
    !canManageFieldComplexesForLocation(
      session,
      viewerStaffRole,
      primaryLocationId,
      complex.locationId
    )
  ) {
    redirect("/teams");
  }

  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? decodeURIComponent(sp.error) : null;

  const backHref =
    session.role === "SUPER_ADMIN"
      ? `/fields/complexes?locationId=${encodeURIComponent(complex.locationId)}`
      : "/fields/complexes";

  const availabilitySorted = [...complex.availabilityWindows].sort((a, b) => {
    const da = DAY_OF_WEEK_ORDER.indexOf(a.dayOfWeek);
    const db = DAY_OF_WEEK_ORDER.indexOf(b.dayOfWeek);
    if (da !== db) return da - db;
    return a.startTime.localeCompare(b.startTime);
  });

  const slotOptions = [15, 20, 30, 45, 60];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <Link href={backHref} className="text-sm text-slate-600 underline-offset-4 hover:underline">
          ← All complexes
        </Link>
        <span className="text-sm text-slate-500">{complex.location.name}</span>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">{complex.name}</h1>
      </div>

      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </p>
      ) : null}

      <section className="rounded border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Complex details</h2>
        <form action={updateComplexAction} className="mt-3 space-y-3">
          <input type="hidden" name="complexId" value={complex.id} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="cname">
              Name
            </label>
            <input
              id="cname"
              name="name"
              required
              defaultValue={complex.name}
              className="max-w-md rounded border border-slate-300 px-2 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="cnotes">
              Notes
            </label>
            <textarea
              id="cnotes"
              name="notes"
              rows={3}
              defaultValue={complex.notes ?? ""}
              className="max-w-xl rounded border border-slate-300 px-2 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input type="checkbox" name="isActive" value="on" defaultChecked={complex.isActive} />
            Active (uncheck to deactivate)
          </label>
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Save complex
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded border border-emerald-200 bg-emerald-50/60 p-4">
        <div>
          <h2 className="text-sm font-semibold text-emerald-950">Scheduling windows</h2>
          <p className="mt-1 text-xs text-emerald-900">
            Open hours for this complex (used later for slot grids). Times are local 24-hour (
            <span className="font-mono">HH:mm</span>).
          </p>
        </div>

        <form
          action={createAvailabilityWindowAction}
          className="flex flex-wrap items-end gap-2 rounded border border-emerald-200 bg-white p-3"
        >
          <input type="hidden" name="complexId" value={complex.id} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="aw-day">
              Day
            </label>
            <select
              id="aw-day"
              name="dayOfWeek"
              required
              className="rounded border border-slate-300 px-2 py-2 text-sm"
              defaultValue={DayOfWeek.MON}
            >
              {DAY_OF_WEEK_ORDER.map((d) => (
                <option key={d} value={d}>
                  {dayOfWeekLabel(d)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="aw-start">
              Start
            </label>
            <input
              id="aw-start"
              name="startTime"
              type="text"
              required
              placeholder="18:00"
              className="w-24 rounded border border-slate-300 px-2 py-2 font-mono text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="aw-end">
              End
            </label>
            <input
              id="aw-end"
              name="endTime"
              type="text"
              required
              placeholder="21:00"
              className="w-24 rounded border border-slate-300 px-2 py-2 font-mono text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="aw-slot">
              Slot
            </label>
            <select
              id="aw-slot"
              name="slotMinutes"
              className="rounded border border-slate-300 px-2 py-2 text-sm"
              defaultValue={30}
            >
              {slotOptions.map((n) => (
                <option key={n} value={n}>
                  {n} min
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add window
          </button>
        </form>

        {availabilitySorted.length === 0 ? (
          <p className="text-sm text-emerald-900">No windows yet.</p>
        ) : (
          <ul className="space-y-3">
            {availabilitySorted.map((w) => (
              <li key={w.id} className="rounded border border-emerald-200 bg-white p-3">
                <form action={updateAvailabilityWindowAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="availabilityId" value={w.id} />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-700">Day</span>
                    <select
                      name="dayOfWeek"
                      defaultValue={w.dayOfWeek}
                      className="rounded border border-slate-300 px-2 py-2 text-sm"
                    >
                      {DAY_OF_WEEK_ORDER.map((d) => (
                        <option key={d} value={d}>
                          {dayOfWeekLabel(d)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-700">Start</span>
                    <input
                      name="startTime"
                      defaultValue={w.startTime}
                      className="w-24 rounded border border-slate-300 px-2 py-2 font-mono text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-700">End</span>
                    <input
                      name="endTime"
                      defaultValue={w.endTime}
                      className="w-24 rounded border border-slate-300 px-2 py-2 font-mono text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-700">Slot</span>
                    <select
                      name="slotMinutes"
                      defaultValue={w.slotMinutes}
                      className="rounded border border-slate-300 px-2 py-2 text-sm"
                    >
                      {slotOptions.map((n) => (
                        <option key={n} value={n}>
                          {n} min
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-800">
                    <input type="checkbox" name="isActive" value="on" defaultChecked={w.isActive} />
                    Active
                  </label>
                  <button
                    type="submit"
                    className="rounded border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-50"
                  >
                    Save window
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Add field</h2>
        <form action={createFieldAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="complexId" value={complex.id} />
          <div className="flex min-w-[120px] flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="fname">
              Field name / label
            </label>
            <input
              id="fname"
              name="name"
              required
              className="rounded border border-slate-300 px-2 py-2 text-sm"
              placeholder='e.g. "1N"'
            />
          </div>
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-slate-700" htmlFor="fnotes">
              Notes (optional)
            </label>
            <input
              id="fnotes"
              name="notes"
              className="rounded border border-slate-300 px-2 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add field
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Fields</h2>
        {complex.fields.length === 0 ? (
          <p className="text-sm text-slate-600">No fields yet.</p>
        ) : (
          <ul className="space-y-4">
            {complex.fields.map((f) => (
              <li key={f.id} className="rounded border border-slate-200 bg-white p-3">
                <form action={updateFieldAction} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="fieldId" value={f.id} />
                  <div className="flex min-w-[100px] flex-1 flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700" htmlFor={`n-${f.id}`}>
                      Name
                    </label>
                    <input
                      id={`n-${f.id}`}
                      name="name"
                      required
                      defaultValue={f.name}
                      className="rounded border border-slate-300 px-2 py-2 text-sm"
                    />
                  </div>
                  <div className="flex min-w-[160px] flex-[2] flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700" htmlFor={`t-${f.id}`}>
                      Notes
                    </label>
                    <input
                      id={`t-${f.id}`}
                      name="notes"
                      defaultValue={f.notes ?? ""}
                      className="rounded border border-slate-300 px-2 py-2 text-sm"
                    />
                  </div>
                  <label className="flex shrink-0 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="isActive"
                      value="on"
                      defaultChecked={f.isActive}
                    />
                    Active
                  </label>
                  <button
                    type="submit"
                    className="shrink-0 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                  >
                    Save
                  </button>
                </form>
                <div className="mt-3 rounded border border-sky-200 bg-sky-50/60 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-900">
                    Field availability override
                  </h3>
                  <p className="mt-1 text-xs text-sky-900">
                    Optional. If none are set, this field inherits complex windows. Overrides must fit
                    within active complex windows for the same day.
                  </p>
                  <form
                    action={createFieldAvailabilityWindowAction}
                    className="mt-3 flex flex-wrap items-end gap-2 rounded border border-sky-200 bg-white p-3"
                  >
                    <input type="hidden" name="fieldId" value={f.id} />
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700" htmlFor={`faw-day-${f.id}`}>
                        Day
                      </label>
                      <select
                        id={`faw-day-${f.id}`}
                        name="dayOfWeek"
                        required
                        className="rounded border border-slate-300 px-2 py-2 text-sm"
                        defaultValue={DayOfWeek.MON}
                      >
                        {DAY_OF_WEEK_ORDER.map((d) => (
                          <option key={d} value={d}>
                            {dayOfWeekLabel(d)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700" htmlFor={`faw-start-${f.id}`}>
                        Start
                      </label>
                      <input
                        id={`faw-start-${f.id}`}
                        name="startTime"
                        type="text"
                        required
                        placeholder="18:00"
                        className="w-24 rounded border border-slate-300 px-2 py-2 font-mono text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700" htmlFor={`faw-end-${f.id}`}>
                        End
                      </label>
                      <input
                        id={`faw-end-${f.id}`}
                        name="endTime"
                        type="text"
                        required
                        placeholder="21:00"
                        className="w-24 rounded border border-slate-300 px-2 py-2 font-mono text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-700" htmlFor={`faw-slot-${f.id}`}>
                        Slot
                      </label>
                      <select
                        id={`faw-slot-${f.id}`}
                        name="slotMinutes"
                        className="rounded border border-slate-300 px-2 py-2 text-sm"
                        defaultValue={30}
                      >
                        {slotOptions.map((n) => (
                          <option key={n} value={n}>
                            {n} min
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="rounded bg-sky-800 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
                    >
                      Add field window
                    </button>
                  </form>
                  {f.availabilityWindows.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-600">No field overrides; using complex windows.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {[...f.availabilityWindows]
                        .sort((a, b) => {
                          const da = DAY_OF_WEEK_ORDER.indexOf(a.dayOfWeek);
                          const db = DAY_OF_WEEK_ORDER.indexOf(b.dayOfWeek);
                          if (da !== db) return da - db;
                          return a.startTime.localeCompare(b.startTime);
                        })
                        .map((w) => (
                          <li key={w.id} className="rounded border border-sky-200 bg-white p-2">
                            <form
                              action={updateFieldAvailabilityWindowAction}
                              className="flex flex-wrap items-end gap-2"
                            >
                              <input type="hidden" name="fieldAvailabilityId" value={w.id} />
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-slate-700">Day</span>
                                <select
                                  name="dayOfWeek"
                                  defaultValue={w.dayOfWeek}
                                  className="rounded border border-slate-300 px-2 py-2 text-sm"
                                >
                                  {DAY_OF_WEEK_ORDER.map((d) => (
                                    <option key={d} value={d}>
                                      {dayOfWeekLabel(d)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-slate-700">Start</span>
                                <input
                                  name="startTime"
                                  defaultValue={w.startTime}
                                  className="w-24 rounded border border-slate-300 px-2 py-2 font-mono text-sm"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-slate-700">End</span>
                                <input
                                  name="endTime"
                                  defaultValue={w.endTime}
                                  className="w-24 rounded border border-slate-300 px-2 py-2 font-mono text-sm"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-slate-700">Slot</span>
                                <select
                                  name="slotMinutes"
                                  defaultValue={w.slotMinutes}
                                  className="rounded border border-slate-300 px-2 py-2 text-sm"
                                >
                                  {slotOptions.map((n) => (
                                    <option key={n} value={n}>
                                      {n} min
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <label className="flex items-center gap-2 text-sm text-slate-800">
                                <input type="checkbox" name="isActive" value="on" defaultChecked={w.isActive} />
                                Active
                              </label>
                              <button
                                type="submit"
                                className="rounded border border-sky-300 bg-white px-3 py-2 text-sm font-medium text-sky-950 hover:bg-sky-50"
                              >
                                Save field window
                              </button>
                            </form>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
