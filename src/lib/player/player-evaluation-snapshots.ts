import type { EvaluationLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PLAYER_EVAL_SNAPSHOT_KEEP = 5;

export type EvaluationNotesNorm = ReturnType<typeof normalizeEvaluationNotesField>;

/** Empty / whitespace-only evaluates to null; otherwise trimmed. */
export function normalizeEvaluationNotesField(value: string | null | undefined): string | null {
  const t = (value ?? "").trim();
  return t === "" ? null : t;
}

export function playerEvaluationWasChanged(prev: {
  evaluationLevel: EvaluationLevel;
  evaluationNotes: string | null;
}, next: { evaluationLevel: EvaluationLevel; evaluationNotes: string | null }): boolean {
  const a = normalizeEvaluationNotesField(prev.evaluationNotes);
  const b = normalizeEvaluationNotesField(next.evaluationNotes);
  return prev.evaluationLevel !== next.evaluationLevel || a !== b;
}

/** Records a snapshot of the evaluation as saved, then trims the list to PLAYER_EVAL_SNAPSHOT_KEEP by createdAt descending. */
export async function appendPlayerEvaluationSnapshot(params: {
  playerId: string;
  evaluationLevel: EvaluationLevel;
  evaluationNotes: string | null;
  authorCoachId: string | null;
  authorUserId: string | null;
}) {
  const evaluationNotes = normalizeEvaluationNotesField(params.evaluationNotes);
  await prisma.$transaction(async (tx) => {
    await tx.playerEvaluationHistory.create({
      data: {
        playerId: params.playerId,
        evaluationLevel: params.evaluationLevel,
        evaluationNotes,
        authorCoachId: params.authorCoachId ?? undefined,
        authorUserId: params.authorUserId ?? undefined,
      },
    });

    const toRemove = await tx.playerEvaluationHistory.findMany({
      where: { playerId: params.playerId },
      orderBy: { createdAt: "desc" },
      skip: PLAYER_EVAL_SNAPSHOT_KEEP,
      select: { id: true },
    });
    const ids = toRemove.map((r) => r.id);
    if (ids.length === 0) return;
    await tx.playerEvaluationHistory.deleteMany({
      where: { id: { in: ids } },
    });
  });
}

/** Most recent snapshots first (typically up to PLAYER_EVAL_SNAPSHOT_KEEP). */
export async function listPlayerEvaluationSnapshots(playerId: string, take = PLAYER_EVAL_SNAPSHOT_KEEP) {
  return prisma.playerEvaluationHistory.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      authorCoach: { select: { id: true, firstName: true, lastName: true } },
    },
  });
}
