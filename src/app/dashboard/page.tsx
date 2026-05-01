import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EvaluationLevel, Gender, PlayerPosition, PlayerStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import {
  listTeamDashboardRows,
  listDashboardMatchingPlayers,
} from "@/lib/services/dashboard.service";
import { formatEval } from "@/lib/ui/formatters";
import { getCoaches, getLeagues, getLocations, getTeamsForSelect } from "@/lib/data/reference";
import { formatCoachPickerLabel } from "@/lib/ui/formatters";
import { AgeGroupSelect } from "@/components/form/age-group-select";
import { needFieldClass, needGkClass } from "@/lib/ui/need-count-style";
import { DashboardFilterForm } from "@/components/dashboard/dashboard-filter-form";
import { parseDashYmdToUtcDate, toUsDateUtc } from "@/lib/ui/date";

const schema = z
  .object({
    seasonLabel: z.string().optional(),
    leagueId: z.string().optional(),
    locationId: z.string().optional(),
    gender: z.nativeEnum(Gender).optional(),
    ageGroupMin: z.string().optional(),
    ageGroupMax: z.string().optional(),
    coachId: z.string().optional(),
    teamId: z.string().optional(),
    teamSort: z.enum(["team", "needed", "assigned", "committed"]).optional(),
    dobMin: z.string().optional(),
    dobMax: z.string().optional(),
    playerEvaluation: z.nativeEnum(EvaluationLevel).optional(),
    playerStatus: z.nativeEnum(PlayerStatus).optional(),
    playerPosition: z.nativeEnum(PlayerPosition).optional(),
    willingToPlayUp: z.enum(["any", "yes", "no"]).optional(),
  })
  .strict();

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  function one(v: string | string[] | undefined): string | undefined {
    if (Array.isArray(v)) return v[0];
    return v;
  }

  const defaultSeason = getServerEnv().DEFAULT_SEASON_LABEL;
  const legacyEval =
    blankToUndefined(one(sp.unassignedEvaluation)) ?? blankToUndefined(one(sp.playerEvaluation));
  const legacyStatus =
    blankToUndefined(one(sp.unassignedStatus)) ?? blankToUndefined(one(sp.playerStatus));
  const legacyPosition =
    blankToUndefined(one(sp.unassignedPosition)) ?? blankToUndefined(one(sp.playerPosition));

  const parsed = schema.safeParse({
    seasonLabel: blankToUndefined(one(sp.seasonLabel)) ?? defaultSeason,
    leagueId: blankToUndefined(one(sp.leagueId)),
    locationId: blankToUndefined(one(sp.locationId)),
    gender: blankToUndefined(one(sp.gender)),
    ageGroupMin: blankToUndefined(one(sp.ageGroupMin)),
    ageGroupMax: blankToUndefined(one(sp.ageGroupMax)),
    coachId: blankToUndefined(one(sp.coachId)),
    teamId: blankToUndefined(one(sp.teamId)),
    teamSort: blankToUndefined(one(sp.teamSort)) ?? "team",
    dobMin: blankToUndefined(one(sp.dobMin)),
    dobMax: blankToUndefined(one(sp.dobMax)),
    playerEvaluation: blankToUndefined(one(sp.playerEvaluation)) ?? legacyEval,
    playerStatus: blankToUndefined(one(sp.playerStatus)) ?? legacyStatus,
    playerPosition: blankToUndefined(one(sp.playerPosition)) ?? legacyPosition,
    willingToPlayUp: blankToUndefined(one(sp.willingToPlayUp)) ?? "any",
  });
  const filters = parsed.success
    ? parsed.data
    : {
        seasonLabel: defaultSeason,
        teamSort: "team" as const,
        willingToPlayUp: "any" as const,
      };

  const dobRange = normalizeDobRange(filters.dobMin, filters.dobMax);

  const [locations, leagues, coaches, teamsForSelect] = await Promise.all([
    getLocations(),
    getLeagues(),
    getCoaches(),
    getTeamsForSelect(filters.seasonLabel ?? defaultSeason),
  ]);
  const [teamRows, matchingPlayers] = await Promise.all([
    listTeamDashboardRows({
      seasonLabel: filters.seasonLabel,
      leagueId: blankToUndefined(filters.leagueId),
      locationId: blankToUndefined(filters.locationId),
      gender: filters.gender,
      ageGroupMin: blankToUndefined(filters.ageGroupMin),
      ageGroupMax: blankToUndefined(filters.ageGroupMax),
      coachId: blankToUndefined(filters.coachId),
      teamId: blankToUndefined(filters.teamId),
      sort: filters.teamSort,
    }),
    listDashboardMatchingPlayers(session, {
      seasonLabel: filters.seasonLabel,
      gender: filters.gender,
      ageGroupMin: blankToUndefined(filters.ageGroupMin),
      ageGroupMax: blankToUndefined(filters.ageGroupMax),
      locationId: blankToUndefined(filters.locationId),
      evaluationLevel: filters.playerEvaluation,
      leagueInterestId: blankToUndefined(filters.leagueId),
      playerStatus: filters.playerStatus,
      primaryPosition: filters.playerPosition,
      willingToPlayUp: filters.willingToPlayUp,
      dobMin: dobRange.dobMin,
      dobMax: dobRange.dobMax,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Team-building dashboard</h1>
        <p className="text-sm text-slate-600">
          Filter teams above, then see every matching player below (assigned and pool). Use age cohort
          and DOB spans to widen or narrow rows.
        </p>
      </div>
      <DashboardFilterForm className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-white p-3 sm:grid-cols-12">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:col-span-12">
          Team roster view
        </span>
        <input
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.seasonLabel ?? defaultSeason}
          name="seasonLabel"
          placeholder="Season"
        />
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.leagueId ?? ""}
          name="leagueId"
        >
          <option value="">All pathways</option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
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
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.coachId ?? ""}
          name="coachId"
        >
          <option value="">All coaches</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {formatCoachPickerLabel(c)}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.teamId ?? ""}
          name="teamId"
        >
          <option value="">All teams</option>
          {teamsForSelect.map((t) => (
            <option key={t.id} value={t.id}>
              {t.teamName}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.teamSort ?? "team"}
          name="teamSort"
        >
          <option value="team">Sort: Team name</option>
          <option value="needed">Sort: Needed players</option>
          <option value="assigned">Sort: Assigned roster</option>
          <option value="committed">Sort: Committed (admin)</option>
        </select>

        <span className="mt-3 border-t border-slate-100 pt-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:col-span-12">
          Player cohort (age &amp; DOB)
        </span>
        <AgeGroupSelect
          emptyLabel="Youngest (none)"
          name="ageGroupMin"
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-3"
          defaultValue={filters.ageGroupMin ?? ""}
        />
        <AgeGroupSelect
          emptyLabel="Oldest (none)"
          name="ageGroupMax"
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-3"
          defaultValue={filters.ageGroupMax ?? ""}
        />
        <label className="block space-y-1 text-xs text-slate-600 sm:col-span-3">
          <span>DOB after (≥)</span>
          <input
            type="date"
            name="dobMin"
            defaultValue={filters.dobMin ?? ""}
            className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-600 sm:col-span-3">
          <span>DOB before (≤)</span>
          <input
            type="date"
            name="dobMax"
            defaultValue={filters.dobMax ?? ""}
            className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
          />
        </label>

        <span className="mt-3 border-t border-slate-100 pt-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:col-span-12">
          Player scouting
        </span>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-4"
          defaultValue={filters.playerEvaluation ?? ""}
          name="playerEvaluation"
        >
          <option value="">Eval: any</option>
          {Object.values(EvaluationLevel).map((e) => (
            <option key={e} value={e}>
              {formatEval(e)}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-4"
          defaultValue={filters.playerStatus ?? ""}
          name="playerStatus"
        >
          <option value="">Pipeline status: any</option>
          {Object.values(PlayerStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-4"
          defaultValue={filters.playerPosition ?? ""}
          name="playerPosition"
        >
          <option value="">Primary position: any</option>
          {Object.values(PlayerPosition).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-4"
          name="willingToPlayUp"
          defaultValue={filters.willingToPlayUp ?? "any"}
        >
          <option value="any">Play-up: any</option>
          <option value="yes">Play-up: yes</option>
          <option value="no">Play-up: no</option>
        </select>

        <div className="flex flex-col gap-2 sm:col-span-12 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Dropdowns apply as you change them. For season text or DOB dates, click Apply.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard?seasonLabel=${encodeURIComponent(filters.seasonLabel ?? defaultSeason)}`}
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

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Team status</h2>
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-2 py-2">Team</th>
                <th className="px-2 py-2">Coach</th>
                <th className="px-2 py-2">Location</th>
                <th className="px-2 py-2">G/A</th>
                <th className="px-2 py-2">League</th>
                <th className="px-2 py-2">Open</th>
                <th className="px-2 py-2 text-right">Prospects</th>
                <th className="px-2 py-2 text-right">Returning</th>
                <th className="px-2 py-2 text-right">Needed</th>
                <th className="px-2 py-2 text-right">Needed by pos</th>
                <th className="px-2 py-2 text-right">Committed</th>
                <th className="px-2 py-2 text-right">Assigned</th>
                <th className="px-2 py-2 text-right">Coach est.</th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map((t) => (
                <tr className="border-t border-slate-100" key={t.id}>
                  <td className="px-2 py-2">
                    <Link href={`/teams/${t.id}`}>{t.teamName}</Link>
                  </td>
                  <td className="px-2 py-2">{t.coachName}</td>
                  <td className="px-2 py-2">{t.locationName}</td>
                  <td className="px-2 py-2">
                    {t.gender === "BOYS" ? "B" : "G"} {t.ageGroup}
                  </td>
                  <td className="px-2 py-2">{t.leagueName ?? "—"}</td>
                  <td className="px-2 py-2">{t.openSession ? "Yes" : "No"}</td>
                  <td className="px-2 py-2 text-right">{t.prospectsCount}</td>
                  <td className="px-2 py-2 text-right">{t.returningPlayerCount}</td>
                  <td className="px-2 py-2 text-right">{t.neededPlayerCount}</td>
                  <td className="px-2 py-2 text-right text-xs">
                    <span className={needGkClass(t.neededGoalkeepers)} title="Goalkeepers needed">
                      GK {t.neededGoalkeepers}
                    </span>
                    <span className="text-slate-500">,&nbsp;</span>
                    <span className={needFieldClass(t.neededDefenders)} title="Defenders needed">
                      D {t.neededDefenders}
                    </span>
                    <span className="text-slate-500">,&nbsp;</span>
                    <span className={needFieldClass(t.neededMidfielders)} title="Midfielders needed">
                      M {t.neededMidfielders}
                    </span>
                    <span className="text-slate-500">,&nbsp;</span>
                    <span className={needFieldClass(t.neededForwards)} title="Forwards needed">
                      F {t.neededForwards}
                    </span>
                    <span className="text-slate-500">,&nbsp;</span>
                    <span className={needFieldClass(t.neededUtility)} title="Utility needed">
                      U {t.neededUtility}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">{t.committedPlayerCount}</td>
                  <td className="px-2 py-2 text-right">{t.assignedPlayerCount}</td>
                  <td className="px-2 py-2 text-right">{t.coachEstimatedPlayerCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Players matching filters</h2>
        <p className="text-xs text-slate-600">
          Includes rostered athletes and pool players. The team and coach filters apply to the roster table
          only; pathway, location, gender, cohort, dates, eval, status, position, and play-up refine this grid.
        </p>
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-2 py-2">Player</th>
                <th className="px-2 py-2">G/A</th>
                <th className="px-2 py-2">DOB</th>
                <th className="px-2 py-2">Location</th>
                <th className="px-2 py-2">Eval</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Position</th>
                <th className="px-2 py-2">Play up</th>
                <th className="px-2 py-2">Coach / team</th>
              </tr>
            </thead>
            <tbody>
              {matchingPlayers.length === 0 && (
                <tr>
                  <td className="px-2 py-6 text-slate-600" colSpan={9}>
                    No players match the current cohort filters (or tighten age / DOB if the range ended up empty).
                  </td>
                </tr>
              )}
              {matchingPlayers.map((p) => (
                <tr className="border-t border-slate-100" key={p.id}>
                  <td className="px-2 py-2">
                    <Link href={`/players/${p.id}`}>
                      {p.lastName}, {p.firstName}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    {p.gender === "BOYS" ? "B" : "G"} {p.overrideAgeGroup ?? p.derivedAgeGroup}
                    {p.willingToPlayUp ? " · play-up" : ""}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">{toUsDateUtc(p.dob)}</td>
                  <td className="px-2 py-2">{p.location.name}</td>
                  <td className="px-2 py-2">{formatEval(p.evaluationLevel)}</td>
                  <td className="px-2 py-2">
                    {p.playerStatus}
                    {p.assignedTeamId == null ? " · pool" : ""}
                  </td>
                  <td className="px-2 py-2">
                    {p.primaryPosition}
                    {p.secondaryPosition ? ` / ${p.secondaryPosition}` : ""}
                  </td>
                  <td className="px-2 py-2">{p.willingToPlayUp ? "Yes · play-up" : "No"}</td>
                  <td className="px-2 py-2">
                    {p.assignedTeam
                      ? `${p.assignedTeam.coach.lastName} / ${p.assignedTeam.teamName}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function normalizeDobRange(
  dobMinRaw: string | undefined,
  dobMaxRaw: string | undefined
): { dobMin?: Date; dobMax?: Date } {
  let a = parseDashYmdToUtcDate(blankToUndefined(dobMinRaw));
  let b = parseDashYmdToUtcDate(blankToUndefined(dobMaxRaw));
  if (a && b && a > b) {
    const swap = a;
    a = b;
    b = swap;
  }
  return { dobMin: a, dobMax: b };
}

function blankToUndefined(v: string | undefined): string | undefined {
  if (!v || v.trim().length === 0) return undefined;
  return v;
}
