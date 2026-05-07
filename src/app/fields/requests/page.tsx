import { FieldRequestStatus } from "@prisma/client";
import {
  approveFieldRequestWithAssignmentAction,
  setFieldRequestStatusAction,
} from "@/app/actions/field-requests";
import { addMinutesToHm } from "@/lib/fields/assignment-intervals";
import { dayOfWeekLabel } from "@/lib/fields/day-of-week-order";
import { formatYmdLocal } from "@/lib/fields/local-date";
import { prisma } from "@/lib/prisma";
import { requireFieldRequestsBoardViewer } from "@/lib/server/field-requests-access";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<{ error?: string; submitted?: string }> };

function statusLabel(s: FieldRequestStatus) {
  switch (s) {
    case "PENDING":
      return "Pending";
    case "APPROVED":
      return "Approved";
    case "DENIED":
      return "Denied";
    case "CANCELLED":
      return "Cancelled";
    default:
      return s;
  }
}

export default async function FieldRequestsBoardPage({ searchParams }: Props) {
  const v = await requireFieldRequestsBoardViewer();
  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? decodeURIComponent(sp.error) : null;

  const noPrimary =
    v.session.role !== "SUPER_ADMIN" && !v.primaryLocationId ? (
      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Set a primary location on your staff profile to filter requests for your site.
      </p>
    ) : null;

  const where =
    v.session.role === "SUPER_ADMIN"
      ? {}
      : { team: { locationId: v.primaryLocationId! } };

  if (v.session.role !== "SUPER_ADMIN" && !v.primaryLocationId) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-900">Field requests</h1>
        {noPrimary}
      </div>
    );
  }

  const requests = await prisma.fieldRequest.findMany({
    where,
    include: {
      team: { select: { teamName: true, seasonLabel: true, locationId: true } },
      requestedByCoach: { select: { firstName: true, lastName: true } },
      preferredField: {
        select: { name: true, complex: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = requests.filter((r) => r.status === FieldRequestStatus.PENDING);
  const approved = requests.filter((r) => r.status === FieldRequestStatus.APPROVED);
  const denied = requests.filter((r) => r.status === FieldRequestStatus.DENIED);

  const pendingLocationIds = [...new Set(pending.map((p) => p.team.locationId))];
  const fieldsLists = await Promise.all(
    pendingLocationIds.map((lid) =>
      prisma.field.findMany({
        where: {
          isActive: true,
          complex: { locationId: lid, isActive: true },
        },
        include: { complex: { select: { name: true } } },
        orderBy: [{ complex: { name: "asc" } }, { name: "asc" }],
      })
    )
  );
  const fieldsByLocationId: Record<string, (typeof fieldsLists)[number]> = {};
  pendingLocationIds.forEach((id, i) => {
    fieldsByLocationId[id] = fieldsLists[i];
  });
  const defaultAssignmentDateYmd = formatYmdLocal(new Date());

  type RequestRow = (typeof requests)[number];

  function RequestSection({
    title,
    empty,
    rows,
    showActions,
    pendingFieldsByLocationId,
    defaultAssignmentDateYmd: defaultAssignDate,
  }: {
    title: string;
    empty: string;
    rows: RequestRow[];
    showActions?: boolean;
    pendingFieldsByLocationId?: Record<string, (typeof fieldsLists)[number]>;
    defaultAssignmentDateYmd?: string;
  }) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-600">{empty}</p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b px-2 py-2">Team</th>
                  <th className="border-b px-2 py-2">Coach</th>
                  <th className="border-b px-2 py-2">Preference</th>
                  <th className="border-b px-2 py-2">Recurrence</th>
                  <th className="border-b px-2 py-2">Notes</th>
                  <th className="border-b px-2 py-2">Status</th>
                  {showActions ? <th className="border-b px-2 py-2">Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 align-top">
                    <td className="px-2 py-2">
                      <div className="font-medium">{r.team.teamName}</div>
                      <div className="text-xs text-slate-600">{r.team.seasonLabel}</div>
                    </td>
                    <td className="px-2 py-2">
                      {r.requestedByCoach.firstName} {r.requestedByCoach.lastName}
                    </td>
                    <td className="px-2 py-2">
                      <div>
                        {dayOfWeekLabel(r.preferredDayOfWeek)} @ {r.preferredStartTime},{" "}
                        {r.preferredSessionLengthMinutes} min
                      </div>
                      {r.preferredField ? (
                        <div className="text-xs text-slate-600">
                          Field: {r.preferredField.complex.name} — {r.preferredField.name}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">No field preference</div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-700">
                      {r.recurrenceRequested ? (
                        <>
                          Yes
                          {r.recurrenceEndDate ? (
                            <>
                              {" "}
                              →{" "}
                              {r.recurrenceEndDate.toISOString().slice(0, 10)}
                            </>
                          ) : null}
                        </>
                      ) : (
                        "No"
                      )}
                      {r.duplicateToOtherDays.length > 0 ? (
                        <div className="mt-1">
                          Also:{" "}
                          {r.duplicateToOtherDays.map((d) => dayOfWeekLabel(d)).join(", ")}
                        </div>
                      ) : null}
                    </td>
                    <td className="max-w-[200px] px-2 py-2 text-xs text-slate-700">
                      {r.notes ?? "—"}
                      {r.directorNotes ? (
                        <div className="mt-1 border-t border-slate-100 pt-1 text-slate-600">
                          Director: {r.directorNotes}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{statusLabel(r.status)}</td>
                    {showActions ? (
                      <td className="px-2 py-2">
                        <div className="flex flex-col gap-2">
                          {pendingFieldsByLocationId && defaultAssignDate ? (
                            (() => {
                              const rowFields =
                                pendingFieldsByLocationId[r.team.locationId] ?? [];
                              const defaultEnd =
                                addMinutesToHm(
                                  r.preferredStartTime,
                                  r.preferredSessionLengthMinutes
                                ) ?? "19:00";
                              const defaultFieldId =
                                r.preferredFieldId &&
                                rowFields.some((f) => f.id === r.preferredFieldId)
                                  ? r.preferredFieldId
                                  : rowFields[0]?.id ?? "";
                              return rowFields.length === 0 ? (
                                <p className="text-xs text-amber-800">
                                  Add active fields for this location before approving.
                                </p>
                              ) : (
                                <form
                                  action={approveFieldRequestWithAssignmentAction}
                                  className="space-y-1 rounded border border-slate-200 bg-slate-50/80 p-2"
                                >
                                  <input type="hidden" name="requestId" value={r.id} />
                                  <label className="block text-xs text-slate-600">Date</label>
                                  <input
                                    type="date"
                                    name="assignmentDate"
                                    required
                                    defaultValue={defaultAssignDate}
                                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                                  />
                                  <label className="block text-xs text-slate-600">Field</label>
                                  <select
                                    name="fieldId"
                                    required
                                    defaultValue={defaultFieldId}
                                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                                  >
                                    {rowFields.map((f) => (
                                      <option key={f.id} value={f.id}>
                                        {f.complex.name} — {f.name}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="grid grid-cols-2 gap-1">
                                    <div>
                                      <label className="block text-xs text-slate-600">Start</label>
                                      <input
                                        name="startTime"
                                        required
                                        placeholder="18:00"
                                        defaultValue={r.preferredStartTime}
                                        className="w-full rounded border border-slate-300 px-1 py-1 font-mono text-xs"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-slate-600">End</label>
                                      <input
                                        name="endTime"
                                        required
                                        placeholder="19:00"
                                        defaultValue={defaultEnd}
                                        className="w-full rounded border border-slate-300 px-1 py-1 font-mono text-xs"
                                      />
                                    </div>
                                  </div>
                                  <label className="block text-xs text-slate-600">
                                    Note (optional)
                                  </label>
                                  <textarea
                                    name="directorNotes"
                                    rows={2}
                                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                                    placeholder="Visible to coach"
                                  />
                                  <button
                                    type="submit"
                                    className="w-full rounded bg-emerald-800 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                                  >
                                    Approve with assignment
                                  </button>
                                </form>
                              );
                            })()
                          ) : null}
                          <form action={setFieldRequestStatusAction} className="space-y-1">
                            <input type="hidden" name="requestId" value={r.id} />
                            <input type="hidden" name="status" value="DENIED" />
                            <textarea
                              name="directorNotes"
                              rows={2}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                              placeholder="Reason (optional)"
                            />
                            <button
                              type="submit"
                              className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-900 hover:bg-slate-300"
                            >
                              Deny
                            </button>
                          </form>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Field requests</h1>
        <p className="mt-1 text-sm text-slate-600">
          Approve by picking the calendar date, field, and session times (saved to the schedule
          grid). Deny with an optional reason.
        </p>
      </div>

      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </p>
      ) : null}
      <RequestSection
        title="Pending"
        empty="No pending requests."
        rows={pending}
        showActions
        pendingFieldsByLocationId={fieldsByLocationId}
        defaultAssignmentDateYmd={defaultAssignmentDateYmd}
      />
      <RequestSection title="Approved" empty="None approved yet." rows={approved} />
      <RequestSection title="Denied" empty="None denied yet." rows={denied} />
    </div>
  );
}
