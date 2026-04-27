import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { listPlayers } from "@/lib/services/players.service";
import { formatEval } from "@/lib/ui/formatters";

export default async function PlayersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const defaultSeason = getServerEnv().DEFAULT_SEASON_LABEL;
  const players = await listPlayers(session, { seasonLabel: defaultSeason });
  return (
    <div className="space-y-6">
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
