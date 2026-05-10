-- My Team roster: TeamCoach, TeamPlayerPlacement, PlayerStatus lifecycle enum migration.
-- Backfills from Team.coachId and Player.assignedTeamId + legacy PlayerStatus.

-- Step 1: New enums
CREATE TYPE "TeamCoachRole" AS ENUM ('HEAD_COACH', 'ASSISTANT_COACH', 'MANAGER');

CREATE TYPE "TeamPlayerPlacementType" AS ENUM ('PRIMARY', 'SECONDARY', 'GUEST');

CREATE TYPE "TeamPlayerPlacementStatus" AS ENUM (
  'INVITED',
  'OFFERED',
  'COMMITTED',
  'NOT_INTERESTED',
  'SECONDARY_REQUESTED',
  'SECONDARY_APPROVED',
  'SECONDARY_DENIED',
  'GUEST_REQUESTED',
  'GUEST_APPROVED',
  'GUEST_DENIED'
);

-- Step 2: TeamCoach
CREATE TABLE "TeamCoach" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "role" "TeamCoachRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamCoach_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamCoach_teamId_coachId_key" ON "TeamCoach"("teamId", "coachId");
CREATE INDEX "TeamCoach_coachId_idx" ON "TeamCoach"("coachId");
CREATE INDEX "TeamCoach_teamId_idx" ON "TeamCoach"("teamId");

ALTER TABLE "TeamCoach" ADD CONSTRAINT "TeamCoach_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamCoach" ADD CONSTRAINT "TeamCoach_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 3: TeamPlayerPlacement
CREATE TABLE "TeamPlayerPlacement" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "status" "TeamPlayerPlacementStatus" NOT NULL,
    "placementType" "TeamPlayerPlacementType" NOT NULL,
    "requestedByCoachId" TEXT,
    "approvedByCoachId" TEXT,
    "approvedByDirectorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamPlayerPlacement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamPlayerPlacement_playerId_teamId_key" ON "TeamPlayerPlacement"("playerId", "teamId");
CREATE INDEX "TeamPlayerPlacement_teamId_status_idx" ON "TeamPlayerPlacement"("teamId", "status");
CREATE INDEX "TeamPlayerPlacement_playerId_idx" ON "TeamPlayerPlacement"("playerId");

ALTER TABLE "TeamPlayerPlacement" ADD CONSTRAINT "TeamPlayerPlacement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamPlayerPlacement" ADD CONSTRAINT "TeamPlayerPlacement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamPlayerPlacement" ADD CONSTRAINT "TeamPlayerPlacement_requestedByCoachId_fkey" FOREIGN KEY ("requestedByCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeamPlayerPlacement" ADD CONSTRAINT "TeamPlayerPlacement_approvedByCoachId_fkey" FOREIGN KEY ("approvedByCoachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeamPlayerPlacement" ADD CONSTRAINT "TeamPlayerPlacement_approvedByDirectorId_fkey" FOREIGN KEY ("approvedByDirectorId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Backfill TeamCoach from legacy Team.coachId (head coach)
INSERT INTO "TeamCoach" ("id", "teamId", "coachId", "role", "createdAt", "updatedAt")
SELECT
    md5(t.id || ':' || t."coachId"),
    t.id,
    t."coachId",
    'HEAD_COACH'::"TeamCoachRole",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Team" t;

-- Step 5: Backfill placements from assigned team + legacy recruiting status (single PRIMARY row per player/team)
INSERT INTO "TeamPlayerPlacement" (
    "id",
    "playerId",
    "teamId",
    "status",
    "placementType",
    "requestedByCoachId",
    "createdAt",
    "updatedAt"
)
SELECT
    md5(p.id || ':' || p."assignedTeamId"),
    p.id,
    p."assignedTeamId",
    CASE p."playerStatus"::text
        WHEN 'COMMITTED' THEN 'COMMITTED'::"TeamPlayerPlacementStatus"
        WHEN 'INVITED' THEN 'INVITED'::"TeamPlayerPlacementStatus"
        WHEN 'NOT_INTERESTED' THEN 'NOT_INTERESTED'::"TeamPlayerPlacementStatus"
        WHEN 'AVAILABLE' THEN 'INVITED'::"TeamPlayerPlacementStatus"
        ELSE 'INVITED'::"TeamPlayerPlacementStatus"
    END,
    'PRIMARY'::"TeamPlayerPlacementType",
    COALESCE(p."createdByCoachId", tm."coachId"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Player" p
INNER JOIN "Team" tm ON tm.id = p."assignedTeamId"
WHERE p."assignedTeamId" IS NOT NULL;

-- Step 6: Migrate Player.playerStatus to lifecycle enum (AVAILABLE | ACTIVE | ARCHIVED)
CREATE TYPE "PlayerStatus_new" AS ENUM ('AVAILABLE', 'ACTIVE', 'ARCHIVED');

ALTER TABLE "Player" ADD COLUMN "playerStatus_migration" "PlayerStatus_new";

UPDATE "Player" p
SET "playerStatus_migration" = CASE
    WHEN p."playerStatus"::text = 'ARCHIVED' THEN 'ARCHIVED'::"PlayerStatus_new"
    WHEN EXISTS (
        SELECT 1
        FROM "TeamPlayerPlacement" tpp
        WHERE tpp."playerId" = p.id
          AND tpp."status" <> 'NOT_INTERESTED'::"TeamPlayerPlacementStatus"
    ) THEN 'ACTIVE'::"PlayerStatus_new"
    ELSE 'AVAILABLE'::"PlayerStatus_new"
END;

ALTER TABLE "Player" DROP COLUMN "playerStatus";

DROP TYPE "PlayerStatus";

ALTER TYPE "PlayerStatus_new" RENAME TO "PlayerStatus";

ALTER TABLE "Player" RENAME COLUMN "playerStatus_migration" TO "playerStatus";

ALTER TABLE "Player" ALTER COLUMN "playerStatus" SET DEFAULT 'AVAILABLE'::"PlayerStatus";
ALTER TABLE "Player" ALTER COLUMN "playerStatus" SET NOT NULL;
