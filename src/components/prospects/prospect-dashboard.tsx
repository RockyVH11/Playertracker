import Link from "next/link";
import { ProspectStatus, ProspectType } from "@prisma/client";
import {
  assignProspectAction,
  deleteProspectAction,
  updateProspectDirectorAction,
} from "@/app/actions/prospects";
import type { ProspectListRow } from "@/lib/services/prospects.service";

type AssignOption = { id: string; firstName: string; lastName: string };
type LocationOption = { id: string; name: string };

type FilterValues = {
  loc: string;
  prospectType?: ProspectType;
  status?: ProspectStatus;
  assignedToCoachId?: string;
  submittedByCoachId?: string;
};

/** Director + Super Admin full prospect dashboard (server-rendered UI). */
export function ProspectDashboard(props: {
  prospects: ProspectListRow[];
  assigneeOptions: AssignOption[];
  locations: LocationOption[];
  filters: FilterValues;
  error: string | null;
  showDelete: boolean;
}) {
  const { prospects, assigneeOptions, locations, filters, error, showDelete } = props;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Prospects</h1>
        <p className="mt-1 text-sm text-slate-600">
          Directors and admins see pipeline-wide CRM context. Sensitive contact fields stay guarded server-side when
          other staff identities request data.
        </p>
      </div>

      <form method="get" action="/prospects" className="grid gap-3 rounded border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-12">
        <label className="flex flex-col gap-1 text-sm lg:col-span-3">
          <span className="text-slate-600">Location</span>
          <select name="loc" defaultValue={filters.loc || "all"} className="rounded border border-slate-300 px-2 py-2">
            <option value="all">All locations</option>
            <option value="unknown">Unknown</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm lg:col-span-2">
          <span className="text-slate-600">Type</span>
          <select name="prospectType" defaultValue={filters.prospectType ?? ""} className="rounded border border-slate-300 px-2 py-2">
            <option value="">Any</option>
            {Object.values(ProspectType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm lg:col-span-2">
          <span className="text-slate-600">Status</span>
          <select name="status" defaultValue={filters.status ?? ""} className="rounded border border-slate-300 px-2 py-2">
            <option value="">Any</option>
            {Object.values(ProspectStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm lg:col-span-2">
          <span className="text-slate-600">Assigned to</span>
          <select
            name="assignedToCoachId"
            defaultValue={filters.assignedToCoachId ?? ""}
            className="rounded border border-slate-300 px-2 py-2"
          >
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {assigneeOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm lg:col-span-3">
          <span className="text-slate-600">Submitted by</span>
          <select
            name="submittedByCoachId"
            defaultValue={filters.submittedByCoachId ?? ""}
            className="rounded border border-slate-300 px-2 py-2"
          >
            <option value="">Anyone</option>
            {assigneeOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2 lg:col-span-12">
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Apply filters
          </button>
          <Link href="/prospects" className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
            Reset
          </Link>
          <Link href="/prospects/new" className="rounded border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-950 hover:bg-emerald-50">
            Add prospect
          </Link>
        </div>
      </form>

      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{error}</p>
      ) : null}

      <div className="space-y-4">
        {prospects.length === 0 ? (
          <p className="text-sm text-slate-600">No prospects match those filters.</p>
        ) : (
          prospects.map((p) => (
            <article key={p.id} className="rounded border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{p.prospectName}</div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    {p.prospectType} · {p.status}
                    {p.location ? ` · ${p.location.name}` : p.locationUnknown ? " · Unknown location" : ""}
                  </div>
                </div>
                <form action={assignProspectAction} className="flex flex-wrap items-end gap-2 text-sm">
                  <input type="hidden" name="prospectId" value={p.id} />
                  <label className="flex flex-col text-xs font-medium text-slate-700">
                    Assignee
                    <select name="assignedToCoachId" defaultValue={p.assignedToCoachId ?? ""} className="rounded border px-2 py-1">
                      <option value="">Clear assignment</option>
                      {assigneeOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.lastName}, {c.firstName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-50">
                    Save assignment
                  </button>
                </form>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-xs uppercase text-slate-500">Contact</div>
                  <div>{[p.contactFirstName, p.contactLastName].filter(Boolean).join(" ") || "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-slate-500">Phone</div>
                  <div>{p.contactPhone ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-slate-500">Email</div>
                  <div>{p.contactEmail ?? "—"}</div>
                </div>
                <div className="text-xs text-slate-500">
                  <div>Submitted: {`${p.submittedByCoach.lastName}, ${p.submittedByCoach.firstName}`}</div>
                  <div>
                    Assigned:{" "}
                    {p.assignedToCoach ? `${p.assignedToCoach.lastName}, ${p.assignedToCoach.firstName}` : "—"}
                  </div>
                </div>
              </div>

              <details className="mt-4 rounded border border-slate-100 bg-slate-50 p-3 text-sm">
                <summary className="cursor-pointer select-none font-medium text-slate-900">Edit full prospect</summary>
                <div className="mt-4">
                  <form action={updateProspectDirectorAction} className="grid gap-3 lg:grid-cols-12">
                    <input type="hidden" name="prospectId" value={p.id} />
                    <label className="flex flex-col gap-1 text-xs lg:col-span-4">
                      <span>Type</span>
                      <select name="prospectType" defaultValue={p.prospectType} className="rounded border px-2 py-2">
                        {Object.values(ProspectType).map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs lg:col-span-8">
                      <span>Name</span>
                      <input name="prospectName" required defaultValue={p.prospectName} className="rounded border px-2 py-2" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs lg:col-span-3">
                      <span>Contact first name</span>
                      <input name="contactFirstName" defaultValue={p.contactFirstName ?? ""} className="rounded border px-2 py-2" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs lg:col-span-3">
                      <span>Contact last name</span>
                      <input name="contactLastName" defaultValue={p.contactLastName ?? ""} className="rounded border px-2 py-2" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs lg:col-span-3">
                      <span>Contact phone</span>
                      <input name="contactPhone" defaultValue={p.contactPhone ?? ""} className="rounded border px-2 py-2" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs lg:col-span-3">
                      <span>Contact email</span>
                      <input name="contactEmail" type="email" defaultValue={p.contactEmail ?? ""} className="rounded border px-2 py-2" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs lg:col-span-4">
                      <span>Location</span>
                      <select
                        name="primaryLocationChoice"
                        required
                        defaultValue={p.locationUnknown ? "unknown" : p.locationId ?? "unknown"}
                        className="rounded border px-2 py-2"
                      >
                        <option value="unknown">Unknown</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs lg:col-span-4">
                      <span>Status</span>
                      <select name="status" defaultValue={p.status} className="rounded border px-2 py-2">
                        {Object.values(ProspectStatus).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs lg:col-span-12">
                      <span>Notes</span>
                      <textarea name="notes" rows={3} defaultValue={p.notes ?? ""} className="rounded border px-2 py-2" />
                    </label>
                    <div className="lg:col-span-12">
                      <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                        Save edits
                      </button>
                    </div>
                  </form>
                  {showDelete ? (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <form action={deleteProspectAction} className="inline">
                        <input type="hidden" name="prospectId" value={p.id} />
                        <button
                          type="submit"
                          className="rounded border border-red-300 px-3 py-2 text-sm text-red-800 hover:bg-red-50"
                        >
                          Delete prospect record
                        </button>
                      </form>
                      <p className="mt-2 text-[11px] text-slate-500">Only deletes this prospect row from the tracker.</p>
                    </div>
                  ) : null}
                </div>
              </details>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
