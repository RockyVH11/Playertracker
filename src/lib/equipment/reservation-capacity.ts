/** Half-open intervals [startM, endM) in minutes since midnight; quantity stacked when intervals overlap. */
export type QtyMinuteSegment = { startM: number; endM: number; quantity: number };

/** Maximum sum of quantities active at any instant (same calendar day implied by caller). */
export function peakConcurrentQty(segments: QtyMinuteSegment[]): number {
  if (segments.length === 0) return 0;
  const bounds = new Set<number>();
  for (const s of segments) {
    bounds.add(s.startM);
    bounds.add(s.endM);
  }
  const sorted = [...bounds].sort((a, b) => a - b);
  let max = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i]!;
    const hi = sorted[i + 1]!;
    if (hi <= lo) continue;
    const mid = lo + (hi - lo) / 2;
    let sum = 0;
    for (const s of segments) {
      if (s.startM <= mid && mid < s.endM) sum += s.quantity;
    }
    max = Math.max(max, sum);
  }
  return max;
}

export function reservationWouldExceedCapacity(
  existing: QtyMinuteSegment[],
  candidate: QtyMinuteSegment,
  capacity: number
): boolean {
  return peakConcurrentQty([...existing, candidate]) > capacity;
}
