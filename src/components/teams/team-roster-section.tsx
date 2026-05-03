import Link from "next/link";
import { DashboardTableCopySection } from "@/components/dashboard/dashboard-table-copy-section";
import type { PlayerListRow } from "@/lib/services/players.service";
import { toUsDateUtc } from "@/lib/ui/date";

/** Roster grid for `/teams/[id]` with the same clipboard export pattern as `/dashboard`. */
export function TeamRosterSection(props: {
  players: PlayerListRow[];
  teamHeaderLine: string;
  copySeasonLabel: string;
}) {
  const { players, teamHeaderLine, copySeasonLabel } = props;

  return (
    <DashboardTableCopySection
      title="Team roster"
      copyIntro={`${teamHeaderLine} · Season ${copySeasonLabel} · Tab-separated (paste into Excel or email)`}
      copyButtonLabel="Copy table"
    >
      <p className="text-xs text-slate-600">
        Players assigned to this team for the roster season below. Clearing the team deletes the squad row only—athletes drop back to the unassigned pool.
      </p>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-2 py-2">Player</th>
              <th className="px-2 py-2">Age group</th>
              <th className="px-2 py-2">DOB</th>
              <th className="px-2 py-2">Location</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Position</th>
              <th className="px-2 py-2">Coach / team</th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td className="px-2 py-6 text-slate-600" colSpan={7}>
                  No athletes are assigned to this team yet—use Assign on a player profile or add a player tied
                  to this squad from the Teams list.
                </td>
              </tr>
            ) : (
              players.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-2 py-2">
                    <Link href={`/players/${p.id}`}>
                      {p.lastName}, {p.firstName}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    {p.gender === "BOYS" ? "B" : "G"} {p.overrideAgeGroup ?? p.derivedAgeGroup}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">{toUsDateUtc(p.dob)}</td>
                  <td className="px-2 py-2">{p.location.name}</td>
                  <td className="px-2 py-2">{p.playerStatus}</td>
                  <td className="px-2 py-2">
                    {p.primaryPosition}
                    {p.secondaryPosition ? ` / ${p.secondaryPosition}` : ""}
                  </td>
                  <td className="px-2 py-2">
                    {p.assignedTeam
                      ? `${p.assignedTeam.coach.lastName} / ${p.assignedTeam.teamName}`
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardTableCopySection>
  );
}
