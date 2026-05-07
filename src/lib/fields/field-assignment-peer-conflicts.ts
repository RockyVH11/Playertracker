import { hmRangesOverlap } from "@/lib/fields/assignment-intervals";

export type AssignmentPeer = {
  id: string;
  fieldId: string;
  teamId: string;
  startTime: string;
  endTime: string;
};

export function peerConflictMessage(
  peers: AssignmentPeer[],
  opts: {
    fieldId: string;
    teamId: string;
    startTime: string;
    endTime: string;
    excludeAssignmentId?: string;
  }
): string | null {
  for (const p of peers) {
    if (opts.excludeAssignmentId && p.id === opts.excludeAssignmentId) continue;
    if (!hmRangesOverlap(opts.startTime, opts.endTime, p.startTime, p.endTime)) continue;
    if (p.fieldId === opts.fieldId) {
      return "That field already has a session overlapping this time.";
    }
    if (p.teamId === opts.teamId) {
      return "That team already has a session overlapping this time.";
    }
  }
  return null;
}
