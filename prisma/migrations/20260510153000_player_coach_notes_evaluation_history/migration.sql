-- AlterTable
ALTER TABLE "Player" ADD COLUMN "coachNotes" VARCHAR(500);

-- CreateTable
CREATE TABLE "PlayerEvaluationHistory" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "evaluationLevel" "EvaluationLevel" NOT NULL,
    "evaluationNotes" TEXT,
    "authorCoachId" TEXT,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerEvaluationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerEvaluationHistory_playerId_createdAt_idx" ON "PlayerEvaluationHistory"("playerId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlayerEvaluationHistory" ADD CONSTRAINT "PlayerEvaluationHistory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerEvaluationHistory" ADD CONSTRAINT "PlayerEvaluationHistory_authorCoachId_fkey" FOREIGN KEY ("authorCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerEvaluationHistory" ADD CONSTRAINT "PlayerEvaluationHistory_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
