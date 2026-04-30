import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { listPlayers } from "@/lib/services/players.service";
import { formatEval } from "@/lib/ui/formatters";
import { getLeagues, getLocations, getTeamsForSelect } from "@/lib/data/reference";
import { EvaluationLevel, PlayerPosition, PlayerStatus } from "@prisma/client";
import { AgeGroupSelect } from "@/components/form/age-group-select";
import { playerFilterSchema } from "@/lib/validation/players";
import { PostCreatePlayerPrompt } from "@/components/players/post-create-player-prompt";
import { DashboardFilterForm } from "@/components/dashboard/dashboard-filter-form";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const evalOrder: EvaluationLevel[] = [
  "RL",
  "N1",
  "N2",
  "GRASSROOTS",
  "NOT_EVALUATED",
];

export default async function PlayersPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  const defaultSeason = getServerEnv().DEFAULT_SEASON_LABEL;
  const sp = await searchParams;
  const parsed = playerFilterSchema.safeParse({
    seasonLabel: blankToUndefined(asString(sp.seasonLabel)) ?? defaultSeason,
    q: blankToUndefined(asString(sp.q)),
    gender: blankToUndefined(asString(sp.gender)),
    ageGroup: blankToUndefined(asString(sp.ageGroup)),
    locationId: blankToUndefined(asString(sp.locationId)),
    leagueInterestId: blankToUndefined(asString(sp.leagueInterestId)),
    evaluationLevel: blankToUndefined(asString(sp.evaluationLevel)),
    assignedTeamId: blankToUndefined(asString(sp.assignedTeamId)),
    assignment: blankToUndefined(asString(sp.assignment)) ?? "any",
    playerStatus: blankToUndefined(asString(sp.playerStatus)),
    primaryPosition: blankToUndefined(asString(sp.primaryPosition)),
  });
  const filters = parsed.success
    ? parsed.data
    : { seasonLabel: defaultSeason, assignment: "any" as const };
  const [players, locations, leagues, teams] = await Promise.all([
    listPlayers(session, filters),
    getLocations(),
    getLeagues(),
    getTeamsForSelect(filters.seasonLabel ?? defaultSeason),
  ]);
  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <PostCreatePlayerPrompt />
      </Suspense>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Players</h1>
          <p className="text-sm text-slate-600">
            Season <span className="font-medium">{defaultSeason}</span>
          </p>
        </div>
        <Link
          className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
          href="/players/new"
        >
          New player
        </Link>
      </div>
      <DashboardFilterForm className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-white p-3 sm:grid-cols-12">
        <input
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-3"
          defaultValue={filters.q ?? ""}
          name="q"
          placeholder="Search first/last name"
        />
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
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
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.gender ?? ""}
          name="gender"
        >
          <option value="">All genders</option>
          <option value="BOYS">Boys</option>
          <option value="GIRLS">Girls</option>
        </select>
        <AgeGroupSelect
          emptyLabel="All ages"
          name="ageGroup"
          defaultValue={filters.ageGroup ?? ""}
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
        />
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.leagueInterestId ?? ""}
          name="leagueInterestId"
        >
          <option value="">All league interest</option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.assignedTeamId ?? ""}
          name="assignedTeamId"
        >
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.teamName}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.assignment ?? "any"}
          name="assignment"
        >
          <option value="any">Any assignment</option>
          <option value="available">Available / unassigned</option>
          <option value="assigned">Assigned</option>
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.evaluationLevel ?? ""}
          name="evaluationLevel"
        >
          <option value="">All evaluations</option>
          {evalOrder.map((e) => (
            <option key={e} value={e}>
              {formatEval(e)}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.playerStatus ?? ""}
          name="playerStatus"
        >
          <option value="">All statuses</option>
          {Object.values(PlayerStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.primaryPosition ?? ""}
          name="primaryPosition"
        >
          <option value="">All positions</option>
          {Object.values(PlayerPosition).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input name="seasonLabel" type="hidden" value={filters.seasonLabel ?? defaultSeason} />
        <div className="flex flex-col gap-2 sm:col-span-12 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Dropdown filters apply immediately. After editing search text, click Apply.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/players?seasonLabel=${encodeURIComponent(filters.seasonLabel ?? defaultSeason)}`}
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
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Age</th>
              <th className="px-3 py-2">Eval</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Team</th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-slate-600" colSpan={5}>
                  No players yet.
                </td>
              </tr>
            )}
            {players.map((p) => (
              <tr className="border-t border-slate-100" key={p.id}>
                <td className="px-3 py-2">
                  <Link className="font-medium" href={`/players/${p.id}`}>
                    {p.lastName}, {p.firstName}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {p.overrideAgeGroup ?? p.derivedAgeGroup}
                  {p.willingToPlayUp ? " · play-up" : ""}
                </td>
                <td className="px-3 py-2">{formatEval(p.evaluationLevel)}</td>
                <td className="px-3 py-2">
                  {p.playerStatus}
                  {p.assignedTeamId == null && " · (pool)"}
                </td>
                <td className="px-3 py-2">
                  {p.assignedTeam
                    ? `${p.assignedTeam.teamName} (${p.assignedTeam.coach.lastName})`
                    : "—"}
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
