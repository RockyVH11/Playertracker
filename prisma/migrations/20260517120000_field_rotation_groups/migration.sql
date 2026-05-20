-- CreateEnum
CREATE TYPE "FieldRotationCadence" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "FieldRotationGroup" (
    "id" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "complexId" TEXT NOT NULL,
    "cadence" "FieldRotationCadence" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" "DayOfWeek"[],
    "anchorDate" DATE NOT NULL,
    "recurrenceEndDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldRotationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldRotationMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "primaryFieldId" TEXT NOT NULL,
    "memberEndDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldRotationMember_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "FieldAssignment" ADD COLUMN "rotationGroupId" TEXT;

-- CreateIndex
CREATE INDEX "FieldRotationGroup_complexId_seasonLabel_idx" ON "FieldRotationGroup"("complexId", "seasonLabel");

-- CreateIndex
CREATE UNIQUE INDEX "FieldRotationMember_groupId_teamId_key" ON "FieldRotationMember"("groupId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldRotationMember_groupId_slotIndex_key" ON "FieldRotationMember"("groupId", "slotIndex");

-- CreateIndex
CREATE INDEX "FieldRotationMember_teamId_idx" ON "FieldRotationMember"("teamId");

-- CreateIndex
CREATE INDEX "FieldAssignment_rotationGroupId_idx" ON "FieldAssignment"("rotationGroupId");

-- AddForeignKey
ALTER TABLE "FieldAssignment" ADD CONSTRAINT "FieldAssignment_rotationGroupId_fkey" FOREIGN KEY ("rotationGroupId") REFERENCES "FieldRotationGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldRotationGroup" ADD CONSTRAINT "FieldRotationGroup_complexId_fkey" FOREIGN KEY ("complexId") REFERENCES "Complex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldRotationMember" ADD CONSTRAINT "FieldRotationMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FieldRotationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldRotationMember" ADD CONSTRAINT "FieldRotationMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldRotationMember" ADD CONSTRAINT "FieldRotationMember_primaryFieldId_fkey" FOREIGN KEY ("primaryFieldId") REFERENCES "Field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
