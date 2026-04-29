import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { getLeagues, getLocations, getTeamsForSelect } from "@/lib/data/reference";
import { createPlayerAction } from "@/app/actions/players";
import { canCreatePlayer } from "@/lib/rbac";
import { isCoachSession } from "@/lib/auth/types";
import {
  EvaluationLevel,
  Gender,
  PlacementPriority,
  PlayerPosition,
  PlayerSource,
  PlayerStatus,
} from "@prisma/client";
import { AgeGroupSelect } from "@/components/form/age-group-select";
import { DobInput } from "@/components/form/dob-input";
import { AssignmentFields } from "@/components/players/assignment-fields";

const evalOrder: EvaluationLevel[] = [
  "RL",
  "N1",
  "N2",
  "GRASSROOTS",
  "NOT_EVALUATED",
];

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewPlayerPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canCreatePlayer(session)) {
    return <p className="text-sm">Not allowed.</p>;
  }
  const defaultSeason = getServerEnv().DEFAULT_SEASON_LABEL;
  const sp = await searchParams;
  const seasonParam = typeof sp.seasonLabel === "string" ? sp.seasonLabel : defaultSeason;
  const season = /^\d{4}-\d{4}$/.test(seasonParam) ? seasonParam : defaultSeason;
  const preferredTeamId = typeof sp.teamId === "string" ? sp.teamId : "";
  const assignModeParam = typeof sp.assign === "string" ? sp.assign : "";
  const defaultAssignMode = assignModeParam === "team" ? "team" : "pool";
  const [locations, leagues, teams] = await Promise.all([
    getLocations(),
    getLeagues(),
    getTeamsForSelect(season, {
      prioritizeCoachId: isCoachSession(session) ? session.coachId : null,
    }),
  ]);
  const error = typeof sp.error === "string" ? sp.error : null;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New player</h1>
      {error && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}
      <form
        action={createPlayerAction}
        className="max-w-2xl space-y-3 rounded border border-slate-200 bg-white p-4"
      >
        <input name="seasonLabel" type="hidden" value={season} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">First name</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" name="firstName" required />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Last name</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" name="lastName" required />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Date of birth</span>
            <DobInput className="w-full rounded border border-slate-300 px-2 py-2" name="dob" required />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Gender</span>
            <select className="w-full rounded border border-slate-300 px-2 py-2" name="gender" required>
              {Object.values(Gender).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        </div>
        <AssignmentFields
          teams={teams}
          locations={locations}
          defaultMode={defaultAssignMode}
          defaultTeamId={preferredTeamId}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">League interest</span>
            <select className="w-full rounded border border-slate-300 px-2 py-2" name="leagueInterestId">
              <option value="">—</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Pipeline status</span>
            <select
              className="w-full rounded border border-slate-300 px-2 py-2"
              name="playerStatus"
              defaultValue={PlayerStatus.AVAILABLE}
            >
              {Object.values(PlayerStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Primary position</span>
            <select className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={PlayerPosition.UNKNOWN} name="primaryPosition">
              {Object.values(PlayerPosition).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Secondary position (optional)</span>
            <select className="w-full rounded border border-slate-300 px-2 py-2" defaultValue="" name="secondaryPosition">
              <option value="">—</option>
              {Object.values(PlayerPosition).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Player source</span>
            <select className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={PlayerSource.COACH_ENTERED} name="playerSource">
              {Object.values(PlayerSource).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Placement priority</span>
            <select className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={PlacementPriority.MEDIUM} name="placementPriority">
              {Object.values(PlacementPriority).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input name="willingToPlayUp" type="checkbox" />
          Willing to play up
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Override age group (older only, optional)</span>
          <AgeGroupSelect
            emptyLabel="Use chart / auto"
            name="overrideAgeGroup"
            className="w-full rounded border border-slate-300 px-2 py-2"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Evaluation</span>
            <select className="w-full rounded border border-slate-300 px-2 py-2" name="evaluationLevel" required>
              {evalOrder.map((e) => (
                <option key={e} value={e}>
                  {e.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Evaluation notes</span>
          <textarea className="w-full rounded border border-slate-300 px-2 py-2" name="evaluationNotes" rows={3} />
        </label>
        <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="text-xs font-medium text-slate-600">Parent / guardian (privacy applies)</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span>Name</span>
              <input className="w-full rounded border border-slate-300 px-2 py-2" name="guardianName" />
            </label>
            <label className="block space-y-1">
              <span>Phone</span>
              <input className="w-full rounded border border-slate-300 px-2 py-2" name="guardianPhone" />
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span>Email</span>
              <input
                className="w-full rounded border border-slate-300 px-2 py-2"
                name="guardianEmail"
                type="email"
              />
            </label>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Creating coach is recorded from your session. Duplicate names are warned after save.
        </p>
        <div className="flex gap-3">
          <button className="rounded bg-slate-900 px-3 py-2 text-sm text-white" type="submit">
            Create
          </button>
          <Link className="text-sm" href="/players">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
