import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { isCoachSession } from "@/lib/auth/types";
import { getServerEnv } from "@/lib/env";
import { listTeams } from "@/lib/services/teams.service";
import { redirect } from "next/navigation";
import { getLeagues, getLocations } from "@/lib/data/reference";
import { teamFilterSchema } from "@/lib/validation/teams";
import { PostCreateTeamPrompt } from "@/components/teams/post-create-team-prompt";
import { DashboardFilterForm } from "@/components/dashboard/dashboard-filter-form";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TeamsPage({ searchParams }: Props) {
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
  const [teams, locations, leagues] = await Promise.all([
    listTeams({
      ...filters,
      prioritizeCoachId: isCoachSession(session) ? session.coachId : null,
    }),
    getLocations(),
    getLeagues(),
  ]);
  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <PostCreateTeamPrompt />
      </Suspense>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Teams</h1>
          <p className="text-sm text-slate-600">
            Season <span className="font-medium">{defaultSeason}</span>
          </p>
        </div>
        {session.role === "SUPER_ADMIN" && (
          <Link
            className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            href="/teams/new"
          >
            New team
          </Link>
        )}
      </div>
      <DashboardFilterForm className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-white p-3 sm:grid-cols-6">
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
        <input name="seasonLabel" type="hidden" value={filters.seasonLabel ?? defaultSeason} />
        <div className="flex flex-col gap-2 sm:col-span-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Dropdown filters apply immediately. After editing search text, click Apply.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/teams?seasonLabel=${encodeURIComponent(filters.seasonLabel ?? defaultSeason)}`}
              className="rounded border border-slate-300 px-4 py-2 text-sm"
            >
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
                  No teams yet.
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
                      href={`/players/new?assign=team&teamId=${encodeURIComponent(t.id)}&seasonLabel=${encodeURIComponent(filters.seasonLabel ?? defaultSeason)}`}
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
