import { describe, expect, it } from "vitest";
import { EvaluationLevel } from "@prisma/client";
import {
  normalizeEvaluationNotesField,
  playerEvaluationWasChanged,
} from "./player-evaluation-snapshots";

describe("normalizeEvaluationNotesField", () => {
  it("treats blank as null", () => {
    expect(normalizeEvaluationNotesField("   ")).toBe(null);
    expect(normalizeEvaluationNotesField(null)).toBe(null);
  });

  it("trims", () => {
    expect(normalizeEvaluationNotesField("  hi  ")).toBe("hi");
  });
});

describe("playerEvaluationWasChanged", () => {
  it("detects note-only change", () => {
    expect(
      playerEvaluationWasChanged(
        { evaluationLevel: EvaluationLevel.RL, evaluationNotes: "a" },
        { evaluationLevel: EvaluationLevel.RL, evaluationNotes: "b" }
      )
    ).toBe(true);
  });

  it("ignores cosmetic whitespace-only note change vs null", () => {
    expect(
      playerEvaluationWasChanged(
        { evaluationLevel: EvaluationLevel.RL, evaluationNotes: null },
        { evaluationLevel: EvaluationLevel.RL, evaluationNotes: "   " }
      )
    ).toBe(false);
  });

  it("detects level change", () => {
    expect(
      playerEvaluationWasChanged(
        { evaluationLevel: EvaluationLevel.RL, evaluationNotes: null },
        { evaluationLevel: EvaluationLevel.N1, evaluationNotes: null }
      )
    ).toBe(true);
  });
});
