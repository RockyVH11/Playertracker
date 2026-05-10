import Link from "next/link";
import {
  Gender,
  PlayerPosition,
  PlayerStatus,
  TeamPlayerPlacementStatus,
  TeamPlayerPlacementType,
} from "@prisma/client";
import { DashboardTableCopySection } from "@/components/dashboard/dashboard-table-copy-section";
import {
  approveGuestByHeadCoachFormAction,
  approveSecondaryByDirectorFormAction,
  denyGuestByHeadCoachFormAction,
  denySecondaryByDirectorFormAction,
  requestPlacementApprovalFromInvitedFormAction,
  returnPrimaryInviteToPoolFormAction,
  transitionTeamPlacementFormAction,
} from "@/app/actions/team-roster";
import type { TeamRosterSummaryCounts } from "@/lib/services/team-roster.service";
import type { TeamRosterPagePermissions } from "@/lib/roster/team-roster-page-permissions";
import {
  formatPlacementStatusLabel,
  formatPlacementTypeLabel,
} from "@/lib/roster/team-roster-display";

function pipelineRowClass(row: {
  placementType: TeamPlayerPlacementType;
}): string {
  if (row.placementType === TeamPlayerPlacementType.SECONDARY) {
    return "bg-sky-200";
  }
  if (row.placementType === TeamPlayerPlacementType.GUEST) {
    return "bg-amber-200";
  }
  return "";
}

type PlacementRow = {
  id: string;
  status: TeamPlayerPlacementStatus;
  placementType: TeamPlayerPlacementType;
  notes: string | null;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    primaryPosition: PlayerPosition;
    gender: Gender;
    derivedAgeGroup: string;
    overrideAgeGroup: string | null;
    playerStatus: PlayerStatus;
  };
};

export function TeamRosterPipelineSection(props: {
  teamId: string;
  teamHeaderLine: string;
  copySeasonLabel: string;
  summary: TeamRosterSummaryCounts;
  placements: PlacementRow[];
  permissions: TeamRosterPagePermissions;
}) {
  const { teamId, teamHeaderLine, copySeasonLabel, summary, placements, permissions } = props;

  const copyIntro = `${teamHeaderLine} · Season ${copySeasonLabel} · Placement pipeline (tab-separated)`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-slate-200 bg-white p-3 text-sm">
          <div className="text-xs text-slate-500">Roster pipeline</div>
          <div className="text-lg font-semibold text-slate-900">
            {summary.rosterPipelineCommittedPlusOffered}
          </div>
          <div className="text-xs text-slate-600">Committed + offered</div>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3 text-sm">
          <div className="text-xs text-slate-500">Evaluation pool</div>
          <div className="text-lg font-semibold text-slate-900">{summary.evaluationPoolInvited}</div>
          <div className="text-xs text-slate-600">Invited</div>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3 text-sm">
          <div className="text-xs text-slate-500">Position-style subtotal</div>
          <div className="text-lg font-semibold text-slate-900">
            {summary.positionSubtotalCommittedOfferedInvited}
          </div>
          <div className="text-xs text-slate-600">Committed + offered + invited</div>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3 text-sm">
          <div className="text-xs text-slate-500">Pending approvals</div>
          <div className="text-lg font-semibold text-slate-900">
            {summary.secondaryPending + summary.guestPending}
          </div>
          <div className="text-xs text-slate-600">
            Secondary {summary.secondaryPending} · Guest {summary.guestPending}
          </div>
        </div>
      </div>

      <DashboardTableCopySection
        title="Roster pipeline (by placement)"
        copyIntro={copyIntro}
        copyButtonLabel="Copy placements table"
      >
        <p className="text-xs text-slate-600">
          Source of truth for recruiting status is each player&apos;s placement row on this team.
          Player lifecycle (AVAILABLE / ACTIVE / ARCHIVED) is separate from placement status.
        </p>
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-2 py-2">Player</th>
                <th className="px-2 py-2">Placement</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Lifecycle</th>
                <th className="px-2 py-2">Position</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {placements.length === 0 ? (
                <tr>
                  <td className="px-2 py-6 text-slate-600" colSpan={6}>
                    No placement rows yet for this team. Inviting a player from another flow creates an
                    INVITED placement here.
                  </td>
                </tr>
              ) : (
                placements.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-t border-slate-100 align-top ${pipelineRowClass(row)}`}
                  >
                    <td className="px-2 py-2">
                      <Link className="text-slate-900 underline-offset-4 hover:underline" href={`/players/${row.player.id}`}>
                        {row.player.lastName}, {row.player.firstName}
                      </Link>
                    </td>
                    <td className="px-2 py-2">{formatPlacementStatusLabel(row.status)}</td>
                    <td className="px-2 py-2">{formatPlacementTypeLabel(row.placementType)}</td>
                    <td className="px-2 py-2">{row.player.playerStatus}</td>
                    <td className="px-2 py-2">{row.player.primaryPosition}</td>
                    <td className="px-2 py-2">
                      <PlacementRowActions
                        teamId={teamId}
                        row={row}
                        permissions={permissions}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DashboardTableCopySection>
    </div>
  );
}

function PlacementRowActions(props: {
  teamId: string;
  row: PlacementRow;
  permissions: TeamRosterPagePermissions;
}) {
  const { teamId, row, permissions } = props;
  const { canTransitionPipeline, canApproveSecondary, guestActionPlacementIds } = permissions;

  if (row.status === TeamPlayerPlacementStatus.INVITED && canTransitionPipeline) {
    const returnToPool =
      row.placementType === TeamPlayerPlacementType.PRIMARY ||
      row.placementType === TeamPlayerPlacementType.SECONDARY ||
      row.placementType === TeamPlayerPlacementType.GUEST ? (
        <form action={returnPrimaryInviteToPoolFormAction}>
          <input name="placementId" type="hidden" value={row.id} />
          <input name="teamId" type="hidden" value={teamId} />
          <button
            className="rounded border border-amber-700/40 bg-white/90 px-2 py-1 text-xs text-amber-950"
            type="submit"
          >
            Return to pool
          </button>
        </form>
      ) : null;

    if (
      row.placementType === TeamPlayerPlacementType.SECONDARY ||
      row.placementType === TeamPlayerPlacementType.GUEST
    ) {
      return (
        <div className="flex flex-wrap gap-1">
          <form action={requestPlacementApprovalFromInvitedFormAction}>
            <input name="placementId" type="hidden" value={row.id} />
            <input name="teamId" type="hidden" value={teamId} />
            <button
              className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-medium text-white"
              type="submit"
            >
              Request approval
            </button>
          </form>
          {returnToPool}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {returnToPool}
        <form action={transitionTeamPlacementFormAction}>
          <input name="placementId" type="hidden" value={row.id} />
          <input name="nextStatus" type="hidden" value={TeamPlayerPlacementStatus.OFFERED} />
          <button className="rounded border border-slate-300 bg-white px-2 py-1 text-xs" type="submit">
            Offer
          </button>
        </form>
        <form action={transitionTeamPlacementFormAction}>
          <input name="placementId" type="hidden" value={row.id} />
          <input name="nextStatus" type="hidden" value={TeamPlayerPlacementStatus.NOT_INTERESTED} />
          <button className="rounded border border-slate-300 bg-white px-2 py-1 text-xs" type="submit">
            Decline
          </button>
        </form>
      </div>
    );
  }

  if (row.status === TeamPlayerPlacementStatus.OFFERED && canTransitionPipeline) {
    return (
      <div className="flex flex-wrap gap-1">
        <form action={transitionTeamPlacementFormAction}>
          <input name="placementId" type="hidden" value={row.id} />
          <input name="nextStatus" type="hidden" value={TeamPlayerPlacementStatus.COMMITTED} />
          <button className="rounded bg-slate-900 px-2 py-1 text-xs text-white" type="submit">
            Commit
          </button>
        </form>
        <form action={transitionTeamPlacementFormAction}>
          <input name="placementId" type="hidden" value={row.id} />
          <input name="nextStatus" type="hidden" value={TeamPlayerPlacementStatus.NOT_INTERESTED} />
          <button className="rounded border border-slate-300 bg-white px-2 py-1 text-xs" type="submit">
            Decline
          </button>
        </form>
      </div>
    );
  }

  if (row.status === TeamPlayerPlacementStatus.SECONDARY_REQUESTED && canApproveSecondary) {
    return (
      <div className="flex flex-wrap gap-1">
        <form action={approveSecondaryByDirectorFormAction}>
          <input name="placementId" type="hidden" value={row.id} />
          <button className="rounded bg-slate-900 px-2 py-1 text-xs text-white" type="submit">
            Approve
          </button>
        </form>
        <form action={denySecondaryByDirectorFormAction}>
          <input name="placementId" type="hidden" value={row.id} />
          <button className="rounded border border-slate-300 bg-white px-2 py-1 text-xs" type="submit">
            Deny
          </button>
        </form>
      </div>
    );
  }

  if (
    row.status === TeamPlayerPlacementStatus.GUEST_REQUESTED &&
    guestActionPlacementIds.has(row.id)
  ) {
    return (
      <div className="flex flex-wrap gap-1">
        <form action={approveGuestByHeadCoachFormAction}>
          <input name="placementId" type="hidden" value={row.id} />
          <button className="rounded bg-slate-900 px-2 py-1 text-xs text-white" type="submit">
            Approve guest
          </button>
        </form>
        <form action={denyGuestByHeadCoachFormAction}>
          <input name="placementId" type="hidden" value={row.id} />
          <button className="rounded border border-slate-300 bg-white px-2 py-1 text-xs" type="submit">
            Deny guest
          </button>
        </form>
      </div>
    );
  }

  return <span className="text-xs text-slate-500">—</span>;
}
