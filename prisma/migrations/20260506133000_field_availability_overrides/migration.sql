-- Field-level availability overrides (must be constrained by app logic to complex windows).
CREATE TABLE "FieldAvailability" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "FieldAvailability_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FieldAvailability_fieldId_dayOfWeek_isActive_idx"
ON "FieldAvailability"("fieldId", "dayOfWeek", "isActive");

ALTER TABLE "FieldAvailability"
ADD CONSTRAINT "FieldAvailability_fieldId_fkey"
FOREIGN KEY ("fieldId") REFERENCES "Field"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
