import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { listTeams } from "@/lib/services/teams.service";
import { redirect } from "next/navigation";

export default async function TeamsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const defaultSeason = getServerEnv().DEFAULT_SEASON_LABEL;
  const teams = await listTeams({ seasonLabel: defaultSeason });
  return (
    <div className="space-y-6">
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
                <td className="px-3 py-2 text-right">{t.coachEstimatedPlayerCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
