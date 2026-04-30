import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EvaluationLevel, Gender, PlayerPosition, PlayerStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import {
  listTeamDashboardRows,
  listUnassignedDashboardPlayers,
} from "@/lib/services/dashboard.service";
import { formatEval } from "@/lib/ui/formatters";
import { getCoaches, getLeagues, getLocations, getTeamsForSelect } from "@/lib/data/reference";
import { formatCoachPickerLabel } from "@/lib/ui/formatters";
import { AgeGroupSelect } from "@/components/form/age-group-select";
import { needFieldClass, needGkClass } from "@/lib/ui/need-count-style";
import { DashboardFilterForm } from "@/components/dashboard/dashboard-filter-form";

const schema = z
  .object({
    seasonLabel: z.string().optional(),
    leagueId: z.string().optional(),
    locationId: z.string().optional(),
    gender: z.nativeEnum(Gender).optional(),
    ageGroup: z.string().optional(),
    coachId: z.string().optional(),
    teamId: z.string().optional(),
    openSession: z.enum(["any", "open", "closed"]).optional(),
    teamSort: z.enum(["team", "needed", "assigned", "committed"]).optional(),
    unassignedEvaluation: z.nativeEnum(EvaluationLevel).optional(),
    unassignedStatus: z.nativeEnum(PlayerStatus).optional(),
    unassignedPosition: z.nativeEnum(PlayerPosition).optional(),
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
  const defaultSeason = getServerEnv().DEFAULT_SEASON_LABEL;
  const parsed = schema.safeParse({
    seasonLabel: blankToUndefined(one(sp.seasonLabel)) ?? defaultSeason,
    leagueId: blankToUndefined(one(sp.leagueId)),
    locationId: blankToUndefined(one(sp.locationId)),
    gender: blankToUndefined(one(sp.gender)),
    ageGroup: blankToUndefined(one(sp.ageGroup)),
    coachId: blankToUndefined(one(sp.coachId)),
    teamId: blankToUndefined(one(sp.teamId)),
    openSession: blankToUndefined(one(sp.openSession)) ?? "any",
    teamSort: blankToUndefined(one(sp.teamSort)) ?? "team",
    unassignedEvaluation: blankToUndefined(one(sp.unassignedEvaluation)),
    unassignedStatus: blankToUndefined(one(sp.unassignedStatus)),
    unassignedPosition: blankToUndefined(one(sp.unassignedPosition)),
    willingToPlayUp: blankToUndefined(one(sp.willingToPlayUp)) ?? "any",
  });
  const filters = parsed.success
    ? parsed.data
    : {
        seasonLabel: defaultSeason,
        openSession: "any" as const,
        teamSort: "team" as const,
        willingToPlayUp: "any" as const,
      };

  const [locations, leagues, coaches, teamsForSelect] = await Promise.all([
    getLocations(),
    getLeagues(),
    getCoaches(),
    getTeamsForSelect(filters.seasonLabel ?? defaultSeason),
  ]);
  const [teamRows, unassigned] = await Promise.all([
    listTeamDashboardRows({
      seasonLabel: filters.seasonLabel,
      leagueId: blankToUndefined(filters.leagueId),
      locationId: blankToUndefined(filters.locationId),
      gender: filters.gender,
      ageGroup: blankToUndefined(filters.ageGroup),
      coachId: blankToUndefined(filters.coachId),
      teamId: blankToUndefined(filters.teamId),
      openSession: filters.openSession,
      sort: filters.teamSort,
    }),
    listUnassignedDashboardPlayers(session, {
      seasonLabel: filters.seasonLabel,
      gender: filters.gender,
      ageGroup: blankToUndefined(filters.ageGroup),
      locationId: blankToUndefined(filters.locationId),
      evaluationLevel: filters.unassignedEvaluation,
      leagueInterestId: blankToUndefined(filters.leagueId),
      playerStatus: filters.unassignedStatus,
      primaryPosition: filters.unassignedPosition,
      willingToPlayUp: filters.willingToPlayUp,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Team-building dashboard</h1>
        <p className="text-sm text-slate-600">
          Club-wide roster planning and unassigned player matching.
        </p>
      </div>
      <DashboardFilterForm className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-white p-3 sm:grid-cols-12">
        <input className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2" defaultValue={filters.seasonLabel ?? defaultSeason} name="seasonLabel" placeholder="Season" />
        <select className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2" defaultValue={filters.leagueId ?? ""} name="leagueId">
          <option value="">All pathways</option>
          {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2" defaultValue={filters.locationId ?? ""} name="locationId">
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2" defaultValue={filters.gender ?? ""} name="gender">
          <option value="">All genders</option>
          <option value="BOYS">Boys</option>
          <option value="GIRLS">Girls</option>
        </select>
        <AgeGroupSelect
          emptyLabel="All age groups"
          name="ageGroup"
          className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2"
          defaultValue={filters.ageGroup ?? ""}
        />
        <select className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2" defaultValue={filters.coachId ?? ""} name="coachId">
          <option value="">All coaches</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {formatCoachPickerLabel(c)}
            </option>
          ))}
        </select>
        <select className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2" defaultValue={filters.teamId ?? ""} name="teamId">
          <option value="">All teams</option>
          {teamsForSelect.map((t) => <option key={t.id} value={t.id}>{t.teamName}</option>)}
        </select>
        <select className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2" defaultValue={filters.openSession ?? "any"} name="openSession">
          <option value="any">Any open status</option>
          <option value="open">Open session only</option>
          <option value="closed">Closed session only</option>
        </select>
        <select className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2" defaultValue={filters.teamSort ?? "team"} name="teamSort">
          <option value="team">Sort: Team</option>
          <option value="needed">Sort: Needed players</option>
          <option value="assigned">Sort: Assigned players</option>
          <option value="committed">Sort: Committed players</option>
        </select>
        <select className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2" defaultValue={filters.unassignedEvaluation ?? ""} name="unassignedEvaluation">
          <option value="">Unassigned eval: Any</option>
          {Object.values(EvaluationLevel).map((e) => <option key={e} value={e}>{formatEval(e)}</option>)}
        </select>
        <select className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2" defaultValue={filters.unassignedStatus ?? ""} name="unassignedStatus">
          <option value="">Unassigned status: Any</option>
          {Object.values(PlayerStatus).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2" defaultValue={filters.unassignedPosition ?? ""} name="unassignedPosition">
          <option value="">Unassigned position: Any</option>
          {Object.values(PlayerPosition).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="rounded border border-slate-300 px-2 py-2 text-sm sm:col-span-2" defaultValue={filters.willingToPlayUp ?? "any"} name="willingToPlayUp">
          <option value="any">Play-up: Any</option>
          <option value="yes">Play-up: Yes</option>
          <option value="no">Play-up: No</option>
        </select>
        <div className="flex flex-col gap-2 sm:col-span-12 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Dropdown filters apply immediately. After changing the season text, click Apply.
          </p>
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Apply filters
          </button>
        </div>
      </DashboardFilterForm>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Team status</h2>
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-2 py-2">Team</th><th className="px-2 py-2">Coach</th><th className="px-2 py-2">Location</th><th className="px-2 py-2">G/A</th><th className="px-2 py-2">League</th><th className="px-2 py-2">Open</th>
                <th className="px-2 py-2 text-right">Prospects</th><th className="px-2 py-2 text-right">Returning</th><th className="px-2 py-2 text-right">Needed</th>
                <th className="px-2 py-2 text-right">Needed by pos</th><th className="px-2 py-2 text-right">Committed</th><th className="px-2 py-2 text-right">Assigned</th><th className="px-2 py-2 text-right">Coach est.</th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map((t) => (
                <tr className="border-t border-slate-100" key={t.id}>
                  <td className="px-2 py-2"><Link href={`/teams/${t.id}`}>{t.teamName}</Link></td>
                  <td className="px-2 py-2">{t.coachName}</td>
                  <td className="px-2 py-2">{t.locationName}</td>
                  <td className="px-2 py-2">{t.gender === "BOYS" ? "B" : "G"} {t.ageGroup}</td>
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
        <h2 className="text-lg font-semibold text-slate-900">Unassigned players</h2>
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-2 py-2">Player</th><th className="px-2 py-2">G/A</th><th className="px-2 py-2">Location</th><th className="px-2 py-2">Eval</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Position</th><th className="px-2 py-2">Play up</th><th className="px-2 py-2">Assigned coach/team</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.map((p) => (
                <tr className="border-t border-slate-100" key={p.id}>
                  <td className="px-2 py-2"><Link href={`/players/${p.id}`}>{p.lastName}, {p.firstName}</Link></td>
                  <td className="px-2 py-2">
                    {p.gender === "BOYS" ? "B" : "G"} {p.overrideAgeGroup ?? p.derivedAgeGroup}
                    {p.willingToPlayUp ? " · play-up" : ""}
                  </td>
                  <td className="px-2 py-2">{p.location.name}</td>
                  <td className="px-2 py-2">{formatEval(p.evaluationLevel)}</td>
                  <td className="px-2 py-2">{p.playerStatus}</td>
                  <td className="px-2 py-2">{p.primaryPosition}{p.secondaryPosition ? ` / ${p.secondaryPosition}` : ""}</td>
                  <td className="px-2 py-2">{p.willingToPlayUp ? "Yes · play-up" : "No"}</td>
                  <td className="px-2 py-2">{p.assignedTeam ? `${p.assignedTeam.coach.lastName} / ${p.assignedTeam.teamName}` : "Unassigned"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function one(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function blankToUndefined(v: string | undefined): string | undefined {
  if (!v || v.trim().length === 0) return undefined;
  return v;
}
