import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getTeamById } from "@/lib/services/teams.service";
import { getCoaches, getLeagues, getLocations } from "@/lib/data/reference";
import { formatCoachPickerLabel } from "@/lib/ui/formatters";
import { updateTeamAction, deleteTeamAction } from "@/app/actions/teams";
import { updateTeamCoachAction } from "@/app/actions/teams-coach";
import { isCoachSession } from "@/lib/auth/types";
import { Gender } from "@prisma/client";
import { AgeGroupSelect } from "@/components/form/age-group-select";
import { needFieldClass, needGkClass } from "@/lib/ui/need-count-style";

type SearchProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TeamDetailPage({ params, searchParams }: SearchProps) {
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const session = await getSession();
  if (!session) redirect("/login");
  const team = await getTeamById(id);
  if (!team) notFound();
  const isAdmin = session.role === "SUPER_ADMIN";
  const isTeamCoach =
    isCoachSession(session) && team.coach.id === session.coachId;
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">{team.teamName}</h1>
        <p className="text-sm text-slate-600">
          {team.seasonLabel} · {team.gender === "BOYS" ? "Boys" : "Girls"} · {team.ageGroup} · {team.location.name}
        </p>
      </div>
      {error && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}
      <div className="grid gap-2 rounded border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
        <div>
          <div className="text-xs text-slate-500">Coach</div>
          <div>
            {team.coach.lastName}, {team.coach.firstName}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">League</div>
          <div>{team.league?.name ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Open session</div>
          <div>{team.openSession ? "Yes" : "No"}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Assigned (computed)</div>
          <div>{team.assignedPlayerCount}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Committed (admin)</div>
          <div>{team.committedPlayerCount}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Coach est.</div>
          <div>{team.coachEstimatedPlayerCount}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Returning</div>
          <div>{team.returningPlayerCount}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Needed total</div>
          <div>{team.neededPlayerCount}</div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs text-slate-500">Needed by position</div>
          <div className="text-sm">
            <span className={needGkClass(team.neededGoalkeepers)}>GK {team.neededGoalkeepers}</span>
            <span className="text-slate-500">, </span>
            <span className={needFieldClass(team.neededDefenders)}>DEF {team.neededDefenders}</span>
            <span className="text-slate-500">, </span>
            <span className={needFieldClass(team.neededMidfielders)}>MID {team.neededMidfielders}</span>
            <span className="text-slate-500">, </span>
            <span className={needFieldClass(team.neededForwards)}>FWD {team.neededForwards}</span>
            <span className="text-slate-500">, </span>
            <span className={needFieldClass(team.neededUtility)}>UTIL {team.neededUtility}</span>
          </div>
        </div>
        {team.recruitingNeeds && (
          <div className="sm:col-span-2">
            <div className="text-xs text-slate-500">Recruiting needs</div>
            <div className="whitespace-pre-wrap">{team.recruitingNeeds}</div>
          </div>
        )}
        {team.notes && (
          <div className="sm:col-span-2">
            <div className="text-xs text-slate-500">Notes</div>
            <div className="whitespace-pre-wrap">{team.notes}</div>
          </div>
        )}
      </div>
      {isAdmin && <AdminEditForm team={team} />}
      {isTeamCoach && !isAdmin && (
        <form
          action={updateTeamCoachAction}
          className="max-w-xl space-y-4 rounded border border-slate-200 bg-white p-4"
        >
          <h2 className="text-sm font-medium text-slate-900">Your updates</h2>
          <input name="id" type="hidden" value={team.id} />
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Coach estimated count</span>
            <input
              className="w-full rounded border border-slate-300 px-2 py-2"
              defaultValue={team.coachEstimatedPlayerCount}
              min={0}
              name="coachEstimatedPlayerCount"
              type="number"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Recruiting needs</span>
            <textarea
              className="w-full rounded border border-slate-300 px-2 py-2"
              defaultValue={team.recruitingNeeds ?? ""}
              name="recruitingNeeds"
              rows={3}
            />
          </label>
          <div className="flex gap-3">
            <button
              className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
              type="submit"
            >
              Save
            </button>
            <Link className="text-sm" href="/teams">
              Back
            </Link>
          </div>
        </form>
      )}
      {!isTeamCoach && !isAdmin && isCoachSession(session) && (
        <p className="text-sm text-slate-600">
          You can view this team. Only the listed coach (or a super admin) can edit
          coach estimates or recruiting notes.
        </p>
      )}
      <div>
        <Link className="text-sm" href="/teams">
          ← All teams
        </Link>
      </div>
    </div>
  );
}

async function AdminEditForm({ team }: { team: Awaited<ReturnType<typeof getTeamById>> }) {
  if (!team) return null;
  const [locations, leagues, coaches] = await Promise.all([
    getLocations(),
    getLeagues(),
    getCoaches(),
  ]);
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-slate-900">Super admin</h2>
      <form
        action={updateTeamAction}
        className="max-w-xl space-y-4 rounded border border-slate-200 bg-white p-4"
      >
        <input name="id" type="hidden" value={team.id} />
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Season</span>
          <input
            className="w-full rounded border border-slate-300 px-2 py-2"
            name="seasonLabel"
            defaultValue={team.seasonLabel}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Team name</span>
          <input
            className="w-full rounded border border-slate-300 px-2 py-2"
            name="teamName"
            defaultValue={team.teamName}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Location</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-2"
            name="locationId"
            required
            defaultValue={team.location.id}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Gender</span>
            <select
              className="w-full rounded border border-slate-300 px-2 py-2"
              name="gender"
              required
              defaultValue={team.gender}
            >
              {Object.values(Gender).map((g) => (
                <option key={g} value={g}>
                  {g}
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
              defaultValue={team.ageGroup}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Returning</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={team.returningPlayerCount} min={0} name="returningPlayerCount" type="number" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Needed total</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={team.neededPlayerCount} min={0} name="neededPlayerCount" type="number" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Needed GK</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={team.neededGoalkeepers} min={0} name="neededGoalkeepers" type="number" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Needed DEF</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={team.neededDefenders} min={0} name="neededDefenders" type="number" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Needed MID</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={team.neededMidfielders} min={0} name="neededMidfielders" type="number" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Needed FWD</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={team.neededForwards} min={0} name="neededForwards" type="number" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Needed UTIL</span>
            <input className="w-full rounded border border-slate-300 px-2 py-2" defaultValue={team.neededUtility} min={0} name="neededUtility" type="number" />
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Coach</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-2"
            name="coachId"
            required
            defaultValue={team.coach.id}
          >
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {formatCoachPickerLabel(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">League</span>
          <select
            className="w-full rounded border border-slate-300 px-2 py-2"
            name="leagueId"
            defaultValue={team.league?.id ?? ""}
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
          <input
            defaultChecked={team.openSession}
            name="openSession"
            type="checkbox"
          />
          Open session
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Committed player count</span>
            <input
              className="w-full rounded border border-slate-300 px-2 py-2"
              defaultValue={team.committedPlayerCount}
              min={0}
              name="committedPlayerCount"
              type="number"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Coach estimated count</span>
            <input
              className="w-full rounded border border-slate-300 px-2 py-2"
              defaultValue={team.coachEstimatedPlayerCount}
              min={0}
              name="coachEstimatedPlayerCount"
              type="number"
            />
          </label>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Recruiting needs</span>
          <textarea
            className="w-full rounded border border-slate-300 px-2 py-2"
            defaultValue={team.recruitingNeeds ?? ""}
            name="recruitingNeeds"
            rows={2}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Notes</span>
          <textarea
            className="w-full rounded border border-slate-300 px-2 py-2"
            defaultValue={team.notes ?? ""}
            name="notes"
            rows={2}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
            type="submit"
          >
            Save
          </button>
        </div>
      </form>
      <form action={deleteTeamAction} className="pt-1">
        <input name="id" type="hidden" value={team.id} />
        <button
          className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          type="submit"
        >
          Delete team
        </button>
      </form>
    </div>
  );
}
