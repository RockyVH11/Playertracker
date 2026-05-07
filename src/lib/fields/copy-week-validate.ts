import type { AssignmentPeer } from "@/lib/fields/field-assignment-peer-conflicts";
import { peerConflictMessage } from "@/lib/fields/field-assignment-peer-conflicts";

export type CloneSlice = {
  fieldId: string;
  teamId: string;
  startTime: string;
  endTime: string;
};

/**
 * Same conflict rules as a single create: each clone is checked against existing peers and
 * previously accepted clones in this batch.
 */
export function validateCloneBatch(
  existingPeers: AssignmentPeer[],
  clones: CloneSlice[]
): string | null {
  const synthetic: AssignmentPeer[] = existingPeers.map((p) => ({ ...p }));
  for (let i = 0; i < clones.length; i++) {
    const c = clones[i]!;
    const msg = peerConflictMessage(synthetic, {
      fieldId: c.fieldId,
      teamId: c.teamId,
      startTime: c.startTime,
      endTime: c.endTime,
    });
    if (msg) return msg;
    synthetic.push({
      id: `__pending_${i}`,
      fieldId: c.fieldId,
      teamId: c.teamId,
      startTime: c.startTime,
      endTime: c.endTime,
    });
  }
  return null;
}
