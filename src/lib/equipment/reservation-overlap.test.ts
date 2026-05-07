import { describe, expect, it } from "vitest";
import { reservationTimeOverlapsExisting } from "@/lib/equipment/reservation-overlap";

describe("reservationTimeOverlapsExisting", () => {
  it("detects overlap", () => {
    expect(
      reservationTimeOverlapsExisting(
        { startTime: "18:00", endTime: "19:30" },
        [{ startTime: "19:00", endTime: "20:00" }]
      )
    ).toBe(true);
  });

  it("allows adjacent non-overlap", () => {
    expect(
      reservationTimeOverlapsExisting(
        { startTime: "18:00", endTime: "19:00" },
        [{ startTime: "19:00", endTime: "20:00" }]
      )
    ).toBe(false);
  });
});
