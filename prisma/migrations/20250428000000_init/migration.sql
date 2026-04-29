-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'COACH');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('BOYS', 'GIRLS');

-- CreateEnum
CREATE TYPE "EvaluationLevel" AS ENUM ('RL', 'N1', 'N2', 'GRASSROOTS', 'NOT_EVALUATED');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('AVAILABLE', 'INVITED', 'COMMITTED', 'NOT_INTERESTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('GK', 'DEFENDER', 'MIDFIELDER', 'FORWARD', 'UTILITY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PlayerSource" AS ENUM ('COACH_ENTERED', 'PARENT_INTEREST_FORM', 'OPEN_SESSION', 'EXISTING_PLAYER', 'COACH_REFERRAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PlacementPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'WATCH_LIST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "primaryAreaLabel" TEXT,
    "primaryLocationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allowedGender" "Gender",
    "conference" TEXT,
    "ageGroup" TEXT,
    "hierarchy" INTEGER,
    "capacity" INTEGER,
    "format" TEXT,
    "notes" TEXT,
    "adminOverrideAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "leagueId" TEXT,
    "openSession" BOOLEAN NOT NULL DEFAULT true,
    "committedPlayerCount" INTEGER NOT NULL DEFAULT 0,
    "coachEstimatedPlayerCount" INTEGER NOT NULL DEFAULT 0,
    "returningPlayerCount" INTEGER NOT NULL DEFAULT 0,
    "neededPlayerCount" INTEGER NOT NULL DEFAULT 0,
    "neededGoalkeepers" INTEGER NOT NULL DEFAULT 0,
    "neededDefenders" INTEGER NOT NULL DEFAULT 0,
    "neededMidfielders" INTEGER NOT NULL DEFAULT 0,
    "neededForwards" INTEGER NOT NULL DEFAULT 0,
    "neededUtility" INTEGER NOT NULL DEFAULT 0,
    "recruitingNeeds" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgeGroupRule" (
    "id" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "dobStart" DATE NOT NULL,
    "dobEnd" DATE NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgeGroupRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "derivedAgeGroup" TEXT NOT NULL,
    "overrideAgeGroup" TEXT,
    "locationId" TEXT NOT NULL,
    "assignedTeamId" TEXT,
    "leagueInterestId" TEXT,
    "playerStatus" "PlayerStatus" NOT NULL DEFAULT 'AVAILABLE',
    "willingToPlayUp" BOOLEAN NOT NULL DEFAULT false,
    "primaryPosition" "PlayerPosition" NOT NULL DEFAULT 'UNKNOWN',
    "secondaryPosition" "PlayerPosition",
    "playerSource" "PlayerSource" NOT NULL DEFAULT 'COACH_ENTERED',
    "placementPriority" "PlacementPriority" NOT NULL DEFAULT 'MEDIUM',
    "externalInterestFormId" TEXT,
    "sourceSubmittedAt" TIMESTAMP(3),
    "importedFromInterestForm" BOOLEAN NOT NULL DEFAULT false,
    "evaluationLevel" "EvaluationLevel" NOT NULL DEFAULT 'NOT_EVALUATED',
    "evaluationNotes" TEXT,
    "evaluationAuthorCoachId" TEXT,
    "evaluationAuthorUserId" TEXT,
    "evaluationUpdatedAt" TIMESTAMP(3),
    "createdByCoachId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerContact" (
    "playerId" TEXT NOT NULL,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "guardianEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerContact_pkey" PRIMARY KEY ("playerId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "actorUserId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payloadJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_email_key" ON "Coach"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "League_name_key" ON "League"("name");

-- CreateIndex
CREATE INDEX "Team_seasonLabel_locationId_gender_ageGroup_leagueId_openSe_idx" ON "Team"("seasonLabel", "locationId", "gender", "ageGroup", "leagueId", "openSession");

-- CreateIndex
CREATE INDEX "AgeGroupRule_seasonLabel_gender_isActive_idx" ON "AgeGroupRule"("seasonLabel", "gender", "isActive");

-- CreateIndex
CREATE INDEX "AgeGroupRule_gender_dobStart_dobEnd_isActive_idx" ON "AgeGroupRule"("gender", "dobStart", "dobEnd", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AgeGroupRule_seasonLabel_gender_ageGroup_key" ON "AgeGroupRule"("seasonLabel", "gender", "ageGroup");

-- CreateIndex
CREATE INDEX "Player_gender_seasonLabel_derivedAgeGroup_overrideAgeGroup__idx" ON "Player"("gender", "seasonLabel", "derivedAgeGroup", "overrideAgeGroup", "locationId", "playerStatus", "evaluationLevel", "assignedTeamId", "primaryPosition");

-- CreateIndex
CREATE INDEX "Player_seasonLabel_firstName_lastName_dob_gender_idx" ON "Player"("seasonLabel", "firstName", "lastName", "dob", "gender");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_primaryLocationId_fkey" FOREIGN KEY ("primaryLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_assignedTeamId_fkey" FOREIGN KEY ("assignedTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_leagueInterestId_fkey" FOREIGN KEY ("leagueInterestId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_evaluationAuthorCoachId_fkey" FOREIGN KEY ("evaluationAuthorCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_evaluationAuthorUserId_fkey" FOREIGN KEY ("evaluationAuthorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_createdByCoachId_fkey" FOREIGN KEY ("createdByCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerContact" ADD CONSTRAINT "PlayerContact_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

