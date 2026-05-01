import Link from "next/link";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { getServerEnv } from "@/lib/env";
import { listTeams, listTeamSeasonHints } from "@/lib/services/teams.service";
import { redirect } from "next/navigation";
import { getLeagues, getLocations } from "@/lib/data/reference";
import { teamFilterSchema } from "@/lib/validation/teams";
import { PostCreateTeamPrompt } from "@/components/teams/post-create-team-prompt";
import { DashboardFilterForm } from "@/components/dashboard/dashboard-filter-form";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TeamsPage({ searchParams }: Props) {
  noStore();
  const session = await getSession();
  if (!session) redirect("/login");
  const defaultSeason = getServerEnv().DEFAULT_SEASON_LABEL;
  const sp = await searchParams;
  const parsed = teamFilterSchema.safeParse({
    seasonLabel: blankToUndefined(asString(sp.seasonLabel)) ?? defaultSeason,
    locationId: blankToUndefined(asString(sp.locationId)),
    gender: blankToUndefined(asString(sp.gender)),
    leagueId: blankToUndefined(asString(sp.leagueId)),
    openSession: blankToUndefined(asString(sp.openSession)) ?? "any",
    q: blankToUndefined(asString(sp.q)),
  });
  const filters = parsed.success
    ? parsed.data
    : { seasonLabel: defaultSeason, openSession: "any" as const };
  const viewingSeason = filters.seasonLabel ?? defaultSeason;
  const [teams, locations, leagues, seasonHints] = await Promise.all([
    listTeams({
      ...filters,
      prioritizeCoachId: isCoachSession(session) ? session.coachId : null,
    }),
    getLocations(),
    getLeagues(),
    listTeamSeasonHints(),
  ]);
  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <PostCreateTeamPrompt
          createAnotherHref={
            session.role === "SUPER_ADMIN"
              ? "/teams/new"
              : `/teams/add?seasonLabel=${encodeURIComponent(viewingSeason)}`
          }
        />
      </Suspense>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Teams</h1>
          <p className="text-sm text-slate-600">
            Showing roster season{" "}
            <span className="font-semibold text-slate-900">{viewingSeason}</span>
            {viewingSeason !== defaultSeason ? (
              <span className="text-slate-500">
                {" "}
                — env default is <span className="font-medium">{defaultSeason}</span>
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            The table follows the season in the filters below—if your new team isn’t visible, check that
            field matches the season you chose on &quot;Add your team&quot; (bookmark links can pin a different
            year).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {session.role === "SUPER_ADMIN" && (
            <Link
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              href="/teams/new"
            >
              New team
            </Link>
          )}
          {isCoachSession(session) && (
            <Link
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
              href={`/teams/add?seasonLabel=${encodeURIComponent(viewingSeason)}`}
            >
              Add your team
            </Link>
          )}
        </div>
      </div>
      <DashboardFilterForm className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-white p-3 sm:grid-cols-6">
        <label className="block space-y-1 text-xs text-slate-600 sm:col-span-2">
          <span className="font-medium uppercase tracking-wide text-slate-500">Roster season</span>
          <input
            className="w-full rounded border border-slate-300 px-2 py-2 text-sm font-mono"
            name="seasonLabel"
            title="YYYY-YYYY (click Apply after editing)"
            defaultValue={viewingSeason}
            list="teams-season-hints"
            placeholder={defaultSeason}
            pattern="\d{4}-\d{4}"
          />
          <datalist id="teams-season-hints">
            {seasonHints.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <input
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.q ?? ""}
          name="q"
          placeholder="Search team name"
        />
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm"
          defaultValue={filters.locationId ?? ""}
          name="locationId"
        >
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm"
          defaultValue={filters.gender ?? ""}
          name="gender"
        >
          <option value="">All genders</option>
          <option value="BOYS">Boys</option>
          <option value="GIRLS">Girls</option>
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm"
          defaultValue={filters.leagueId ?? ""}
          name="leagueId"
        >
          <option value="">All leagues</option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm"
          defaultValue={filters.openSession ?? "any"}
          name="openSession"
        >
          <option value="any">Any session status</option>
          <option value="open">Open session only</option>
          <option value="closed">Closed session only</option>
        </select>
        <div className="flex flex-col gap-2 sm:col-span-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Dropdown filters apply immediately. Click <strong>Apply</strong> after editing roster season or
            name search. Use <strong>No league / internal only</strong> when a squad has no pathway row in
            the database.
          </p>
          <div className="flex items-center gap-2">
            <Link href="/teams" className="rounded border border-slate-300 px-4 py-2 text-sm">
              Reset filters
            </Link>
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Apply filters
            </button>
          </div>
        </div>
      </DashboardFilterForm>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">Coach</th>
              <th className="px-3 py-2">League</th>
              <th className="px-3 py-2">Age / gender</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Open</th>
              <th className="px-3 py-2 text-right">Assigned</th>
              <th className="px-3 py-2 text-right">Committed</th>
              <th className="px-3 py-2 text-right">Coach est.</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-slate-600" colSpan={9}>
                  No teams for <strong className="text-slate-800">{viewingSeason}</strong> with these
                  filters{filters.q?.trim() ? " (including your name search)" : ""}.
                  <span className="mt-2 block text-sm">
                    Wrong year? Adjust <strong>Roster season</strong> above to match{" "}
                    <strong>Add your team</strong>, then Apply.
                  </span>
                  <Link
                    className="mt-2 inline-block text-sm font-medium text-slate-900 underline"
                    href={`/teams?seasonLabel=${encodeURIComponent(defaultSeason)}`}
                  >
                    Jump to env default season ({defaultSeason})
                  </Link>
                </td>
              </tr>
            )}
            {teams.map((t) => (
              <tr className="border-t border-slate-100" key={t.id}>
                <td className="px-3 py-2">
                  <Link className="font-medium" href={`/teams/${t.id}`}>
                    {t.teamName}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {t.coach.lastName}, {t.coach.firstName}
                </td>
                <td className="px-3 py-2">{t.league?.name ?? "—"}</td>
                <td className="px-3 py-2">
                  {t.ageGroup} · {t.gender === "BOYS" ? "Boys" : "Girls"}
                </td>
                <td className="px-3 py-2">{t.location.name}</td>
                <td className="px-3 py-2">{t.openSession ? "Yes" : "No"}</td>
                <td className="px-3 py-2 text-right">{t.assignedPlayerCount}</td>
                <td className="px-3 py-2 text-right">{t.committedPlayerCount}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span>{t.coachEstimatedPlayerCount}</span>
                    <Link
                      href={`/players/new?assign=team&teamId=${encodeURIComponent(t.id)}&seasonLabel=${encodeURIComponent(viewingSeason)}`}
                      className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      + Add player
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function asString(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function blankToUndefined(v: string | undefined): string | undefined {
  if (!v || v.trim().length === 0) return undefined;
  return v;
}
