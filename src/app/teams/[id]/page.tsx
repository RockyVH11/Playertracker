import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getTeamById } from "@/lib/services/teams.service";
import { getCoaches, getLeagues, getLocations } from "@/lib/data/reference";
import { updateTeamAction, deleteTeamAction } from "@/app/actions/teams";
import { updateTeamCoachAction } from "@/app/actions/teams-coach";
import { isCoachSession } from "@/lib/auth/types";
import { Gender } from "@prisma/client";

type Props = { params: Promise<{ id: string }> };

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params;
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
            <input
              className="w-full rounded border border-slate-300 px-2 py-2"
              name="ageGroup"
              defaultValue={team.ageGroup}
              required
            />
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
                {c.lastName}, {c.firstName}
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
