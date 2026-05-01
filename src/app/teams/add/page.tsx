import Link from "next/link";
import { redirect } from "next/navigation";
import { Gender } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { getServerEnv } from "@/lib/env";
import { getLeagues, getLocations } from "@/lib/data/reference";
import { createTeamAction } from "@/app/actions/teams";
import { AgeGroupSelect } from "@/components/form/age-group-select";
import { prisma } from "@/lib/prisma";
import { coerceRosterSeasonQueryParam } from "@/lib/teams/roster-season-filter";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function oneParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CoachAddTeamPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isCoachSession(session)) {
    redirect("/teams");
  }

  const env = getServerEnv();
  const defaultSeason = env.DEFAULT_SEASON_LABEL;
  const [locations, leagues, coachRow] = await Promise.all([
    getLocations(),
    getLeagues(),
    prisma.coach.findFirst({
      where: { id: session.coachId },
      select: { lastName: true, primaryLocationId: true },
    }),
  ]);

  const sp = await searchParams;
  const rawSeason = oneParam(sp.seasonLabel)?.trim();
  const seasonForForm = coerceRosterSeasonQueryParam(
    rawSeason?.length ? rawSeason : undefined,
    defaultSeason
  );
  const rawErr = typeof sp.error === "string" ? sp.error : null;
  const error = rawErr ? decodeURIComponent(rawErr) : null;

  const coachLast = coachRow?.lastName?.trim() || "your last name";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm">
          <Link className="text-slate-600 hover:underline" href="/teams">
            ← Teams
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Add your team</h1>
        <p className="mt-1 text-sm text-slate-600">
          Names follow club standards:{" "}
          <strong>{env.CLUB_DISPLAY_NAME}</strong>, age and gender (e.g.{" "}
          <strong>U11B</strong> / <strong>U11G</strong>), optional pathway tokens from the league
          dropdown, then <strong>{coachLast}</strong>.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Example without a league:&nbsp;
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85rem]">
            {env.CLUB_DISPLAY_NAME} U11B {coachLast}
          </code>
          . With a pathway, league words appear between the age band and your name.
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
        <input type="hidden" name="seasonLabel" value={seasonForForm} />
        <input type="hidden" name="coachId" value={session.coachId} />
        <input type="hidden" name="_coachSelfCreate" value="1" />
        <input type="hidden" name="returningPlayerCount" value="0" />
        <input type="hidden" name="neededPlayerCount" value="0" />
        <input type="hidden" name="neededGoalkeepers" value="0" />
        <input type="hidden" name="neededDefenders" value="0" />
        <input type="hidden" name="neededMidfielders" value="0" />
        <input type="hidden" name="neededForwards" value="0" />
        <input type="hidden" name="neededUtility" value="0" />
        <input type="hidden" name="committedPlayerCount" value="0" />
        <input type="hidden" name="coachEstimatedPlayerCount" value="0" />

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Training / home location</span>
          <select
            name="locationId"
            required
            className="w-full rounded border border-slate-300 px-2 py-2"
            defaultValue={coachRow?.primaryLocationId ?? ""}
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
            <span className="font-medium">Boys or girls</span>
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
          <span className="font-medium">League / pathway (optional)</span>
          <span className="block text-xs font-normal text-slate-500">
            Skip this if the team name should not include pathway words—many internal groups omit it.
          </span>
          <select name="leagueId" className="mt-1 w-full rounded border border-slate-300 px-2 py-2">
            <option value="">No league in the name</option>
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
        <p className="text-xs text-slate-500">
          You cannot type a custom display name; the app builds it from these fields and your roster
          last name. Super admin can adjust rare cases or add a second squad (-Black / -Red) if there is
          a duplicate name.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
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
