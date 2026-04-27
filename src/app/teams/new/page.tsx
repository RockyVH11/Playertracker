import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { getCoaches, getLeagues, getLocations } from "@/lib/data/reference";
import { createTeamAction } from "@/app/actions/teams";
import { Gender } from "@prisma/client";

export default async function NewTeamPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Not allowed</h1>
        <p className="text-sm text-slate-600">
          Only super admin can create teams in this MVP.
        </p>
        <Link className="text-sm" href="/teams">
          Back to teams
        </Link>
      </div>
    );
  }
  const defaultSeason = getServerEnv().DEFAULT_SEASON_LABEL;
  const [locations, leagues, coaches] = await Promise.all([
    getLocations(),
    getLeagues(),
    getCoaches(),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New team</h1>
        <p className="text-sm text-slate-600">Create a team for the season.</p>
      </div>
      <form action={createTeamAction} className="max-w-xl space-y-4 rounded border border-slate-200 bg-white p-4">
        <input name="seasonLabel" type="hidden" value={defaultSeason} />
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Team name</span>
          <input
            className="w-full rounded border border-slate-300 px-2 py-2"
            name="teamName"
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Location</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-2"
            name="locationId"
            required
          >
            <option value="">Select</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Gender</span>
            <select
              className="w-full rounded border border-slate-300 px-2 py-2"
              name="gender"
              required
            >
              {Object.values(Gender).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Age group</span>
            <input
              className="w-full rounded border border-slate-300 px-2 py-2"
              name="ageGroup"
              required
            />
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Coach</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-2"
            name="coachId"
            required
          >
            <option value="">Select</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">League</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-2"
            name="leagueId"
          >
            <option value="">—</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input defaultChecked name="openSession" type="checkbox" />
          Open session
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Committed player count (admin)</span>
            <input
              className="w-full rounded border border-slate-300 px-2 py-2"
              defaultValue={0}
              min={0}
              name="committedPlayerCount"
              type="number"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Coach estimated count</span>
            <input
              className="w-full rounded border border-slate-300 px-2 py-2"
              defaultValue={0}
              min={0}
              name="coachEstimatedPlayerCount"
              type="number"
            />
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Recruiting needs</span>
          <textarea
            className="w-full rounded border border-slate-300 px-2 py-2"
            name="recruitingNeeds"
            rows={2}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Notes</span>
          <textarea
            className="w-full rounded border border-slate-300 px-2 py-2"
            name="notes"
            rows={2}
          />
        </label>
        <div className="flex gap-3">
          <button
            className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            type="submit"
          >
            Create team
          </button>
          <Link
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            href="/teams"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
