import Link from "next/link";
import { assignPlayerToTeamRosterFormAction } from "@/app/actions/team-roster";
import type { PlayerListRow } from "@/lib/services/players.service";
import { toUsDateUtc } from "@/lib/ui/date";
import { RosterPlayerNotesEvalExpand } from "@/components/teams/roster-player-notes-eval-expand";

export function TeamRosterPoolSection(props: {
  teamId: string;
  poolPlayers: PlayerListRow[];
  canAddFromPool: boolean;
  /** Same gate as adding from pool: roster staff who may edit coach notes / evaluation from this sheet. */
  canEditRosterNotes: boolean;
}) {
  const { teamId, poolPlayers, canAddFromPool, canEditRosterNotes } = props;

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-900">Available player pool</h2>
      <p className="text-xs text-slate-600">
        Unassigned players at this location who match this team&apos;s gender and age eligibility. Add a{" "}
        <strong>primary</strong> roster track (assignment + invited placement), or start a{" "}
        <strong>secondary</strong> (blue pipeline) / <strong>guest</strong> (gold pipeline) track without assigning
        them here — then use <strong>Request approval</strong> on the pipeline. Guest requests require the player to be
        committed elsewhere first; use secondary while they are still in the pool only.
      </p>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-2 py-2">Player</th>
              <th className="w-px whitespace-nowrap px-1 py-2 text-center" title="Coach notes / evaluation">
                More
              </th>
              <th className="px-2 py-2">Age group</th>
              <th className="px-2 py-2">DOB</th>
              <th className="px-2 py-2">Location</th>
              <th className="px-2 py-2">Position</th>
              <th className="px-2 py-2 text-right">Add to pipeline</th>
            </tr>
          </thead>
          <tbody>
            {poolPlayers.length === 0 ? (
              <tr>
                <td className="px-2 py-5 text-slate-600" colSpan={7}>
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
                  <td className="px-2 py-2 align-top">
                    <Link className="text-slate-900 underline-offset-4 hover:underline" href={`/players/${p.id}`}>
                      {p.lastName}, {p.firstName}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-1 py-2 align-top text-center">
                    <RosterPlayerNotesEvalExpand
                      coachNotes={p.coachNotes}
                      evaluationAuthorCoach={p.evaluationAuthorCoach}
                      evaluationLevel={p.evaluationLevel}
                      evaluationNotes={p.evaluationNotes}
                      evaluationUpdatedAt={p.evaluationUpdatedAt}
                      canEdit={canEditRosterNotes}
                      playerId={p.id}
                      teamId={teamId}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    {p.gender === "BOYS" ? "B" : "G"} {p.overrideAgeGroup ?? p.derivedAgeGroup}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 align-top">{toUsDateUtc(p.dob)}</td>
                  <td className="px-2 py-2 align-top">{p.location.name}</td>
                  <td className="px-2 py-2 align-top">{p.primaryPosition}</td>
                  <td className="px-2 py-2 align-top">
                    {canAddFromPool ? (
                      <div className="flex flex-col items-end gap-1 sm:flex-row sm:flex-wrap sm:justify-end">
                        <form action={assignPlayerToTeamRosterFormAction} className="inline">
                          <input name="teamId" type="hidden" value={teamId} />
                          <input name="playerId" type="hidden" value={p.id} />
                          <input name="poolPlacementRole" type="hidden" value="primary" />
                          <button
                            type="submit"
                            className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800"
                          >
                            Primary
                          </button>
                        </form>
                        <form action={assignPlayerToTeamRosterFormAction} className="inline">
                          <input name="teamId" type="hidden" value={teamId} />
                          <input name="playerId" type="hidden" value={p.id} />
                          <input name="poolPlacementRole" type="hidden" value="secondary" />
                          <button
                            type="submit"
                            className="rounded bg-sky-700 px-2 py-1 text-xs font-medium text-white hover:bg-sky-800"
                          >
                            Secondary
                          </button>
                        </form>
                        <form action={assignPlayerToTeamRosterFormAction} className="inline">
                          <input name="teamId" type="hidden" value={teamId} />
                          <input name="playerId" type="hidden" value={p.id} />
                          <input name="poolPlacementRole" type="hidden" value="guest" />
                          <button
                            type="submit"
                            className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
                          >
                            Guest
                          </button>
                        </form>
                      </div>
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
