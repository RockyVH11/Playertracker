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

export default async function AdminNewTeamPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/teams");

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
      <TeamSquadSplitModal show={squadDup} stale={squadDup && !hasDraft} formBase="admin" />
      <div>
        <p className="text-sm">
          <Link className="text-slate-600 hover:underline" href="/teams">
            ← Teams
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Add team</h1>
        <p className="mt-1 text-sm text-slate-600">
          Coach, location, sex, age group (U6–U17 / U19), league/pathway—display names generate automatically
          (<strong>{env.CLUB_DISPLAY_NAME}</strong> · Ux G/B · league pathway · coach last) unless overridden.
          Counts default to zero; refine later on the team page.
        </p>
      </div>
      {error ? (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      ) : null}
      <form
        action={createTeamAction}
        className="max-w-lg space-y-4 rounded border border-slate-200 bg-white p-4"
      >
        <input name="seasonLabel" type="hidden" value={defaultSeason} />
        <input name="returningPlayerCount" type="hidden" value={0} />
        <input name="neededPlayerCount" type="hidden" value={0} />
        <input name="neededGoalkeepers" type="hidden" value={0} />
        <input name="neededDefenders" type="hidden" value={0} />
        <input name="neededMidfielders" type="hidden" value={0} />
        <input name="neededForwards" type="hidden" value={0} />
        <input name="neededUtility" type="hidden" value={0} />
        <input name="committedPlayerCount" type="hidden" value={0} />
        <input name="coachEstimatedPlayerCount" type="hidden" value={0} />
        <input name="_returnToAdmin" type="hidden" value="1" />

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Display name override (optional)</span>
          <span className="block text-xs font-normal text-slate-500">
            Leave blank to auto-generate. Use only if you need a bespoke label (parallel squads can use −Black /
            −Red after a duplicate).
          </span>
          <input
            name="teamNameManual"
            placeholder="Leave blank for auto naming"
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Coach</span>
          <select
            name="coachId"
            required
            className="w-full rounded border border-slate-300 px-2 py-2"
          >
            <option value="">Select coach</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {formatCoachPickerLabel(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Location</span>
          <select
            name="locationId"
            required
            className="w-full rounded border border-slate-300 px-2 py-2"
          >
            <option value="">Select location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Sex / Gender</span>
            <select
              name="gender"
              required
              className="w-full rounded border border-slate-300 px-2 py-2"
            >
              {Object.values(Gender).map((g) => (
                <option key={g} value={g}>
                  {g === "BOYS" ? "Boys" : "Girls"}
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
        <label className="block space-y-1 text-sm">
          <span className="font-medium">League / pathway</span>
          <select
            name="leagueId"
            className="w-full rounded border border-slate-300 px-2 py-2"
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
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-600">Notes (optional)</span>
          <textarea
            name="notes"
            rows={2}
            className="w-full rounded border border-slate-300 px-2 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-600">Recruiting needs (optional)</span>
          <textarea
            name="recruitingNeeds"
            rows={2}
            className="w-full rounded border border-slate-300 px-2 py-2"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            type="submit"
          >
            Create team
          </button>
          <Link className="rounded border border-slate-300 px-4 py-2 text-sm" href="/teams">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
