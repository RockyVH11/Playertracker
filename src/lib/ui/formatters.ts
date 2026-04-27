import type { EvaluationLevel } from "@prisma/client";

const labels: Record<EvaluationLevel, string> = {
  RL_FOR_SURE: "RL for sure",
  BORDERLINE_RL: "Borderline RL",
  N1: "N1",
  N2: "N2",
  OTHER: "Other",
};

export function formatEval(l: EvaluationLevel) {
  return labels[l] ?? l;
}
