import { prisma } from "@/lib/prisma";
import { updateLeagueAction } from "@/app/actions/admin-leagues";
import { Gender } from "@prisma/client";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminLeaguesPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? sp.error : null;
  const leagues = await prisma.league.findMany({
    orderBy: [{ hierarchy: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900">Leagues</h2>
      <p className="text-sm text-slate-600">
        Set gender hints (e.g. boys-only Frontier pathways) and optional pathway metadata. Team forms can enforce or warn elsewhere.
      </p>
      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {decodeURIComponent(error)}
        </p>
      ) : null}
      <ul className="space-y-4">
        {leagues.map((lg) => (
          <li key={lg.id} className="rounded border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-semibold text-slate-900">{lg.name}</h3>
            <form action={updateLeagueAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input type="hidden" name="id" value={lg.id} />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Allowed gender hint</span>
                <select
                  name="allowedGender"
                  defaultValue={lg.allowedGender ?? ""}
                  className="rounded border border-slate-300 px-2 py-2"
                >
                  <option value="">(any)</option>
                  <option value={Gender.BOYS}>Boys only</option>
                  <option value={Gender.GIRLS}>Girls only</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="adminOverrideAllowed"
                  defaultChecked={lg.adminOverrideAllowed}
                />
                <span className="text-slate-600">Allow admin gender override</span>
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-2">
                <span className="text-slate-600">Conference</span>
                <input
                  name="conference"
                  defaultValue={lg.conference ?? ""}
                  className="rounded border border-slate-300 px-2 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Pathway age group label</span>
                <input
                  name="ageGroup"
                  defaultValue={lg.ageGroup ?? ""}
                  className="rounded border border-slate-300 px-2 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Hierarchy (tier #)</span>
                <input
                  name="hierarchy"
                  defaultValue={lg.hierarchy ?? ""}
                  className="rounded border border-slate-300 px-2 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Capacity</span>
                <input
                  name="capacity"
                  defaultValue={lg.capacity ?? ""}
                  className="rounded border border-slate-300 px-2 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Format</span>
                <input
                  name="format"
                  defaultValue={lg.format ?? ""}
                  className="rounded border border-slate-300 px-2 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-slate-600">Notes</span>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={lg.notes ?? ""}
                  className="rounded border border-slate-300 px-2 py-2"
                />
              </label>
              <div className="flex items-end sm:col-span-2">
                <button
                  type="submit"
                  className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Save
                </button>
              </div>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
