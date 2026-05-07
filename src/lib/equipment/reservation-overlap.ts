import { hmRangesOverlap } from "@/lib/fields/assignment-intervals";

export type ReservationSlice = {
  startTime: string;
  endTime: string;
};

export function reservationTimeOverlapsExisting(
  candidate: ReservationSlice,
  existing: ReservationSlice[]
): boolean {
  for (const e of existing) {
    if (hmRangesOverlap(candidate.startTime, candidate.endTime, e.startTime, e.endTime)) {
      return true;
    }
  }
  return false;
}
