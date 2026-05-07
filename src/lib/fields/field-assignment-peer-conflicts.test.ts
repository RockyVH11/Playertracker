import { describe, expect, it } from "vitest";
import { peerConflictMessage } from "@/lib/fields/field-assignment-peer-conflicts";

describe("peerConflictMessage", () => {
  const peers = [
    {
      id: "a1",
      fieldId: "f1",
      teamId: "t1",
      startTime: "18:00",
      endTime: "19:00",
    },
  ];

  it("returns null when no overlap", () => {
    expect(
      peerConflictMessage(peers, {
        fieldId: "f1",
        teamId: "t2",
        startTime: "19:00",
        endTime: "20:00",
      })
    ).toBe(null);
  });

  it("detects field conflict", () => {
    expect(
      peerConflictMessage(peers, {
        fieldId: "f1",
        teamId: "t2",
        startTime: "18:30",
        endTime: "19:30",
      })
    ).toContain("field");
  });

  it("detects team conflict", () => {
    expect(
      peerConflictMessage(peers, {
        fieldId: "f2",
        teamId: "t1",
        startTime: "18:15",
        endTime: "18:45",
      })
    ).toContain("team");
  });
});
