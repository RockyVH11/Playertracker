-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('DIRECTOR', 'COACH', 'MANAGER');

-- CreateEnum
CREATE TYPE "ProspectType" AS ENUM ('PLAYER', 'TEAM', 'COACH');

-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('NEW', 'ASSIGNED', 'CONTACTED', 'IN_PROGRESS', 'CONVERTED', 'CLOSED');

-- AlterTable
ALTER TABLE "Coach" ADD COLUMN "staffRole" "StaffRole" NOT NULL DEFAULT 'COACH';

-- Backfill StaffRole from legacy label (best-effort)
UPDATE "Coach"
SET "staffRole" = 'DIRECTOR'
WHERE LOWER(COALESCE(TRIM("staffRoleLabel"), '')) LIKE '%director%';

UPDATE "Coach"
SET "staffRole" = 'MANAGER'
WHERE "staffRole" <> 'DIRECTOR'
  AND LOWER(COALESCE(TRIM("staffRoleLabel"), '')) LIKE '%manager%';

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "prospectType" "ProspectType" NOT NULL,
    "prospectName" TEXT NOT NULL,
    "contactFirstName" TEXT,
    "contactLastName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "locationId" TEXT,
    "locationUnknown" BOOLEAN NOT NULL DEFAULT false,
    "assignedToCoachId" TEXT,
    "submittedByCoachId" TEXT NOT NULL,
    "notes" TEXT,
    "status" "ProspectStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prospect_status_prospectType_idx" ON "Prospect"("status", "prospectType");

-- CreateIndex
CREATE INDEX "Prospect_locationId_idx" ON "Prospect"("locationId");

-- CreateIndex
CREATE INDEX "Prospect_assignedToCoachId_idx" ON "Prospect"("assignedToCoachId");

-- CreateIndex
CREATE INDEX "Prospect_submittedByCoachId_idx" ON "Prospect"("submittedByCoachId");

-- CreateIndex
CREATE INDEX "Prospect_createdAt_idx" ON "Prospect"("createdAt");

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_assignedToCoachId_fkey" FOREIGN KEY ("assignedToCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_submittedByCoachId_fkey" FOREIGN KEY ("submittedByCoachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
