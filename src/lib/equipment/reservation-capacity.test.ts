import { describe, expect, it } from "vitest";
import {
  peakConcurrentQty,
  reservationWouldExceedCapacity,
} from "@/lib/equipment/reservation-capacity";

describe("reservation-capacity", () => {
  it("sums overlapping quantities", () => {
    const peak = peakConcurrentQty([
      { startM: 18 * 60, endM: 19 * 60, quantity: 2 },
      { startM: 18 * 60 + 30, endM: 19 * 60 + 30, quantity: 2 },
    ]);
    expect(peak).toBe(4);
  });

  it("adjacent non-overlapping slots do not stack", () => {
    const peak = peakConcurrentQty([
      { startM: 18 * 60, endM: 19 * 60, quantity: 2 },
      { startM: 19 * 60, endM: 20 * 60, quantity: 2 },
    ]);
    expect(peak).toBe(2);
  });

  it("reservationWouldExceedCapacity respects pool size", () => {
    const existing = [{ startM: 18 * 60, endM: 19 * 60, quantity: 2 }];
    const candidate = { startM: 18 * 60 + 30, endM: 19 * 60 + 30, quantity: 2 };
    expect(reservationWouldExceedCapacity(existing, candidate, 4)).toBe(false);
    expect(reservationWouldExceedCapacity(existing, candidate, 3)).toBe(true);
  });
});
