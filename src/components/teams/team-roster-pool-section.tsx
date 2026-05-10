import Link from "next/link";
import { assignPlayerToTeamRosterFormAction } from "@/app/actions/team-roster";
import type { PlayerListRow } from "@/lib/services/players.service";
import { toUsDateUtc } from "@/lib/ui/date";

export function TeamRosterPoolSection(props: {
  teamId: string;
  poolPlayers: PlayerListRow[];
  canAddFromPool: boolean;
}) {
  const { teamId, poolPlayers, canAddFromPool } = props;

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-900">Available player pool</h2>
      <p className="text-xs text-slate-600">
        Unassigned players at this location who match this team&apos;s gender and age eligibility. Use{" "}
        <strong>Add to roster</strong> to assign them here — they appear as <strong>INVITED</strong> on the
        pipeline above (same as team-building &quot;commit&quot;).
      </p>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-2 py-2">Player</th>
              <th className="px-2 py-2">Age group</th>
              <th className="px-2 py-2">DOB</th>
              <th className="px-2 py-2">Location</th>
              <th className="px-2 py-2">Position</th>
              <th className="px-2 py-2"> </th>
            </tr>
          </thead>
          <tbody>
            {poolPlayers.length === 0 ? (
              <tr>
                <td className="px-2 py-5 text-slate-600" colSpan={6}>
                  No eligible unassigned players at this location for this squad — adjust filters on the{" "}
                  <Link className="underline" href="/players">
                    Players
                  </Link>{" "}
                  list or add athletes from{" "}
                  <Link className="underline" href="/dashboard/team-building">
                    Team-building
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              poolPlayers.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-2 py-2">
                    <Link className="text-slate-900 underline-offset-4 hover:underline" href={`/players/${p.id}`}>
                      {p.lastName}, {p.firstName}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    {p.gender === "BOYS" ? "B" : "G"} {p.overrideAgeGroup ?? p.derivedAgeGroup}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">{toUsDateUtc(p.dob)}</td>
                  <td className="px-2 py-2">{p.location.name}</td>
                  <td className="px-2 py-2">{p.primaryPosition}</td>
                  <td className="px-2 py-2 text-right">
                    {canAddFromPool ? (
                      <form action={assignPlayerToTeamRosterFormAction} className="inline">
                        <input name="teamId" type="hidden" value={teamId} />
                        <input name="playerId" type="hidden" value={p.id} />
                        <button
                          type="submit"
                          className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800"
                        >
                          Add to roster
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
