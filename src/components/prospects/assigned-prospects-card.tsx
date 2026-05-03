import Link from "next/link";
import { ProspectStatus } from "@prisma/client";
import { updateProspectByAssigneeAction } from "@/app/actions/prospects";
import { listProspectsAssignedToCoach } from "@/lib/services/prospects.service";

export async function AssignedProspectsCard(props: {
  heading?: string;
  coachId: string;
}) {
  const rows = await listProspectsAssignedToCoach(props.coachId);

  const heading =
    props.heading ?? "My assigned prospects";

  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">{heading}</h2>
        <Link href="/prospects/new" className="text-sm font-medium text-slate-700 underline underline-offset-2">
          Add a prospect
        </Link>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        Update status or notes below. Sensitive contact stays limited to Directors, admins, whoever submitted
        the lead, and you while it is assigned to you.
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No prospects are assigned to you yet.</p>
      ) : (
        <div className="mt-4 space-y-6">
          {rows.map((p) => (
            <div key={p.id} className="rounded border border-slate-100 bg-slate-50 p-3 text-sm">
              <div className="font-medium text-slate-900">{p.prospectName}</div>
              <div className="mt-1 text-xs text-slate-600">
                Type {p.prospectType} · Status {p.status}
                {p.location ? ` · Loc ${p.location.name}` : p.locationUnknown ? " · Unknown location" : null}
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-800">
                <div className="rounded bg-white px-2 py-1 ring-1 ring-slate-200">
                  <span className="font-medium text-slate-600">Name: </span>
                  {[p.contactFirstName, p.contactLastName].filter(Boolean).join(" ").trim() || "—"}
                </div>
                <div className="rounded bg-white px-2 py-1 ring-1 ring-slate-200">
                  <span className="font-medium text-slate-600">Phone: </span>
                  {p.contactPhone ?? "—"}
                </div>
                <div className="rounded bg-white px-2 py-1 ring-1 ring-slate-200">
                  <span className="font-medium text-slate-600">Email: </span>
                  {p.contactEmail ?? "—"}
                </div>
              </div>

              <form action={updateProspectByAssigneeAction} className="mt-3 grid gap-2 sm:grid-cols-3">
                <input type="hidden" name="prospectId" value={p.id} />
                <label className="flex flex-col gap-1 text-xs sm:col-span-1">
                  <span className="font-medium text-slate-700">Pipeline status</span>
                  <select
                    name="status"
                    defaultValue={p.status}
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  >
                    {Object.values(ProspectStatus).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                  <span className="font-medium text-slate-700">Notes</span>
                  <textarea
                    name="notes"
                    defaultValue={p.notes ?? ""}
                    rows={2}
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium hover:bg-slate-50"
                  >
                    Save updates
                  </button>
                </div>
              </form>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
