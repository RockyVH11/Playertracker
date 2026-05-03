import Link from "next/link";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { getServerEnv } from "@/lib/env";
import { listTeams, listTeamSeasonHints } from "@/lib/services/teams.service";
import { redirect } from "next/navigation";
import { getLeagues, getLocations } from "@/lib/data/reference";
import { coerceRosterSeasonQueryParam } from "@/lib/teams/roster-season-filter";
import { teamFilterSchema } from "@/lib/validation/teams";
import { PostCreateTeamPrompt } from "@/components/teams/post-create-team-prompt";
import { DashboardFilterForm } from "@/components/dashboard/dashboard-filter-form";
import { dashboardHref } from "@/lib/dashboard/dashboard-query-params";

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
  const rawSeasonParam = asString(sp.seasonLabel)?.trim();
  const rosterSeasonClean = coerceRosterSeasonQueryParam(
    rawSeasonParam?.length ? rawSeasonParam : undefined,
    defaultSeason
  );
  if (rawSeasonParam && rawSeasonParam !== rosterSeasonClean) {
    redirect(buildTeamsFiltersUrl(sp, rosterSeasonClean));
  }
  const parsed = teamFilterSchema.safeParse({
    seasonLabel: rosterSeasonClean,
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
  const seasonSelectOptions = Array.from(
    new Set([defaultSeason, ...seasonHints, viewingSeason])
  ).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

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
          <select
            name="seasonLabel"
            className="w-full rounded border border-slate-300 px-2 py-2 text-sm font-mono"
            defaultValue={viewingSeason}
            title="Switches roster year immediately (same as other dropdown filters)"
          >
            {seasonSelectOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
            Roster season and other dropdowns apply immediately when changed. Click <strong>Apply</strong>
            after editing the name search. Use <strong>No league / internal only</strong> for squads
            without a pathway row.
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
                  <div className="flex flex-col gap-0.5">
                    <Link className="font-medium" href={`/teams/${t.id}`}>
                      {t.teamName}
                    </Link>
                    <Link
                      href={dashboardHref({
                        seasonLabel: viewingSeason,
                        teamId: t.id,
                      })}
                      className="text-xs font-normal text-slate-600 underline-offset-2 hover:underline"
                    >
                      Dashboard roster view
                    </Link>
                  </div>
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

const TEAMS_SEARCH_KEYS = [
  "locationId",
  "gender",
  "leagueId",
  "openSession",
  "q",
  "promptAddAnother",
  "newTeam",
] as const;

/** Rebuild `/teams` query with a canonical roster season when the incoming param was malformed. */
function buildTeamsFiltersUrl(
  sp: Record<string, string | string[] | undefined>,
  seasonLabel: string
): string {
  const u = new URLSearchParams();
  u.set("seasonLabel", seasonLabel);
  for (const k of TEAMS_SEARCH_KEYS) {
    const v = blankToUndefined(asString(sp[k]));
    if (v !== undefined) {
      u.set(k, v);
    }
  }
  const qs = u.toString();
  return qs ? `/teams?${qs}` : "/teams";
}
