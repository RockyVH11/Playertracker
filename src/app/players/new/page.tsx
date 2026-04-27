import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { getLeagues, getLocations, getTeamsForSelect } from "@/lib/data/reference";
import { createPlayerAction } from "@/app/actions/players";
import { canCreatePlayer } from "@/lib/rbac";
import { EvaluationLevel, Gender, PlayerStatus } from "@prisma/client";

const evalOrder: EvaluationLevel[] = [
  "RL_FOR_SURE",
  "BORDERLINE_RL",
  "N1",
  "N2",
  "OTHER",
];

export default async function NewPlayerPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canCreatePlayer(session)) {
    return <p className="text-sm">Not allowed.</p>;
  }
  const defaultSeason = getServerEnv().DEFAULT_SEASON_LABEL;
  const [locations, leagues, teams] = await Promise.all([
    getLocations(),
    getLeagues(),
    getTeamsForSelect(defaultSeason),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New player</h1>
      <form
        action={createPlayerAction}
        className="max-w-2xl space-y-3 rounded border border-slate-200 bg-white p-4"
      >
        <input name="seasonLabel" type="hidden" value={defaultSeason} />
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
            <input className="w-full rounded border border-slate-300 px-2 py-2" name="dob" required type="date" />
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
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Location</span>
            <select className="w-full rounded border border-slate-300 px-2 py-2" name="locationId" required>
              <option value="">Select</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Assigned team (optional)</span>
            <select className="w-full rounded border border-slate-300 px-2 py-2" name="assignedTeamId">
              <option value="">— (pool / unassigned)</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teamName} · {t.ageGroup} · {t.gender}
                </option>
              ))}
            </select>
          </label>
        </div>
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
        <label className="inline-flex items-center gap-2 text-sm">
          <input name="willingToPlayUp" type="checkbox" />
          Willing to play up
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Override age group (older only, optional)</span>
          <input className="w-full rounded border border-slate-300 px-2 py-2" name="overrideAgeGroup" />
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
