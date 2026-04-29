import { prisma } from "@/lib/prisma";
import {
  createLocationAction,
  deleteLocationAction,
} from "@/app/actions/admin-locations";

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

function LocationsTable({
  rows,
}: {
  rows: {
    id: string;
    name: string;
    teams: number;
    players: number;
    primaryCoaches: number;
  }[];
}) {
  return (
    <table className="w-full border-collapse border border-slate-200 bg-white text-left text-sm">
      <thead>
        <tr className="border-b bg-slate-50">
          <th className="border-b border-slate-200 px-2 py-2">Location</th>
          <th className="border-b border-slate-200 px-2 py-2 text-right">
            Teams
          </th>
          <th className="border-b border-slate-200 px-2 py-2 text-right">
            Players
          </th>
          <th className="border-b border-slate-200 px-2 py-2 text-right">
            Coaches (primary)
          </th>
          <th className="border-b border-slate-200 px-2 py-2" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="border-b border-slate-100 px-2 py-2">{r.name}</td>
            <td className="border-b border-slate-100 px-2 py-2 text-right">
              {r.teams}
            </td>
            <td className="border-b border-slate-100 px-2 py-2 text-right">
              {r.players}
            </td>
            <td className="border-b border-slate-100 px-2 py-2 text-right">
              {r.primaryCoaches}
            </td>
            <td className="border-b border-slate-100 px-2 py-2">
              {r.teams === 0 && r.players === 0 && r.primaryCoaches === 0 ? (
                <form action={deleteLocationAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </form>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function AdminLocationsPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const error = typeof sp.error === "string" ? sp.error : null;
  const locs = await prisma.location.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const rows = [];
  for (const l of locs) {
    const [teams, players, primaryCoaches] = await Promise.all([
      prisma.team.count({ where: { locationId: l.id } }),
      prisma.player.count({ where: { locationId: l.id } }),
      prisma.coach.count({ where: { primaryLocationId: l.id } }),
    ]);
    rows.push({ ...l, teams, players, primaryCoaches });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Locations</h2>
      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {decodeURIComponent(error)}
        </p>
      ) : null}
      <form
        action={createLocationAction}
        className="flex max-w-xl flex-wrap items-end gap-2 rounded border border-slate-200 bg-slate-50 p-3"
      >
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="name">
            New location name
          </label>
          <input
            id="name"
            name="name"
            required
            className="rounded border border-slate-300 px-2 py-2 text-sm"
            placeholder="e.g. Wichita Falls"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add
        </button>
      </form>
      <LocationsTable rows={rows} />
    </div>
  );
}
