import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { getCoaches, getLeagues, getLocations } from "@/lib/data/reference";
import { formatCoachPickerLabel } from "@/lib/ui/formatters";
import { createTeamAction } from "@/app/actions/teams";
import { Gender } from "@prisma/client";
import { AgeGroupSelect } from "@/components/form/age-group-select";
import { TEAM_SQUAD_DRAFT_COOKIE } from "@/lib/team-squad-draft";
import { TeamSquadSplitModal } from "@/components/teams/team-squad-split-modal";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewTeamPage({ searchParams }: Props) {
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
  const env = getServerEnv();
  const defaultSeason = env.DEFAULT_SEASON_LABEL;
  const [locations, leagues, coaches] = await Promise.all([
    getLocations(),
    getLeagues(),
    getCoaches(),
  ]);
  const sp = await searchParams;
  const rawErr = typeof sp.error === "string" ? sp.error : null;
  const error = rawErr ? decodeURIComponent(rawErr) : null;
  const squadDup = typeof sp.squadDup === "string" && sp.squadDup === "1";
  const hasDraft = !!(await cookies()).get(TEAM_SQUAD_DRAFT_COOKIE)?.value;

  return (
    <div className="space-y-6">
      <TeamSquadSplitModal show={squadDup} stale={squadDup && !hasDraft} formBase="teams" />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New team</h1>
        <p className="text-sm text-slate-600">
          Display names default to club + age/gender + league pathway tokens + coach last—for example{" "}
          <strong>
            {env.CLUB_DISPLAY_NAME} U19G … Van Husen
          </strong>{" "}
          when the league pathway is<code className="mx-1 font-mono text-xs">N1 NTx D1</code>.
          Override below only if needed.
        </p>
      </div>
      {error && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}
      <form action={createTeamAction} className="max-w-xl space-y-4 rounded border border-slate-200 bg-white p-4">
        <input name="seasonLabel" type="hidden" value={defaultSeason} />
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Display name override (optional)</span>
          <span className="block text-xs font-normal text-slate-500">
            Leave blank to auto-generate from club, pathway, gender, age, and coach selections above.
            If you need a collision split, leaving this blank triggers the −Black / −Red flow.
          </span>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
            name="teamNameManual"
            placeholder="Leave blank for auto naming"
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
            <AgeGroupSelect
              name="ageGroup"
              required
              className="w-full rounded border border-slate-300 px-2 py-2"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Returning</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={0} min={0} name="returningPlayerCount" type="number" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Needed total</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={0} min={0} name="neededPlayerCount" type="number" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Needed GK</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={0} min={0} name="neededGoalkeepers" type="number" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Needed DEF</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={0} min={0} name="neededDefenders" type="number" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Needed MID</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={0} min={0} name="neededMidfielders" type="number" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Needed FWD</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={0} min={0} name="neededForwards" type="number" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Needed UTIL</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={0} min={0} name="neededUtility" type="number" />
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
                {formatCoachPickerLabel(c)}
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
