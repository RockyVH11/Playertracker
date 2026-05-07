-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT');

-- CreateEnum
CREATE TYPE "FieldRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EquipmentReservationStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Complex" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Field" (
    "id" TEXT NOT NULL,
    "complexId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplexAvailability" (
    "id" TEXT NOT NULL,
    "complexId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ComplexAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldRequest" (
    "id" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "requestedByCoachId" TEXT NOT NULL,
    "preferredDayOfWeek" "DayOfWeek" NOT NULL,
    "preferredStartTime" TEXT NOT NULL,
    "preferredSessionLengthMinutes" INTEGER NOT NULL,
    "preferredFieldId" TEXT,
    "recurrenceRequested" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceEndDate" DATE,
    "duplicateToOtherDays" "DayOfWeek"[] DEFAULT ARRAY[]::"DayOfWeek"[],
    "notes" TEXT,
    "status" "FieldRequestStatus" NOT NULL DEFAULT 'PENDING',
    "directorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldAssignment" (
    "id" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "assignmentDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "recurrenceGroupId" TEXT,
    "sourceRequestId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldBlackout" (
    "id" TEXT NOT NULL,
    "complexId" TEXT NOT NULL,
    "fieldId" TEXT,
    "blackoutDate" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldBlackout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentItem" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentReservation" (
    "id" TEXT NOT NULL,
    "equipmentItemId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "reservedByCoachId" TEXT NOT NULL,
    "reservationDate" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "linkedFieldAssignmentId" TEXT,
    "status" "EquipmentReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentReservation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Complex" ADD CONSTRAINT "Complex_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Field" ADD CONSTRAINT "Field_complexId_fkey" FOREIGN KEY ("complexId") REFERENCES "Complex"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplexAvailability" ADD CONSTRAINT "ComplexAvailability_complexId_fkey" FOREIGN KEY ("complexId") REFERENCES "Complex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldRequest" ADD CONSTRAINT "FieldRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldRequest" ADD CONSTRAINT "FieldRequest_requestedByCoachId_fkey" FOREIGN KEY ("requestedByCoachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldRequest" ADD CONSTRAINT "FieldRequest_preferredFieldId_fkey" FOREIGN KEY ("preferredFieldId") REFERENCES "Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldAssignment" ADD CONSTRAINT "FieldAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldAssignment" ADD CONSTRAINT "FieldAssignment_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldAssignment" ADD CONSTRAINT "FieldAssignment_sourceRequestId_fkey" FOREIGN KEY ("sourceRequestId") REFERENCES "FieldRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldBlackout" ADD CONSTRAINT "FieldBlackout_complexId_fkey" FOREIGN KEY ("complexId") REFERENCES "Complex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldBlackout" ADD CONSTRAINT "FieldBlackout_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentItem" ADD CONSTRAINT "EquipmentItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentReservation" ADD CONSTRAINT "EquipmentReservation_equipmentItemId_fkey" FOREIGN KEY ("equipmentItemId") REFERENCES "EquipmentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentReservation" ADD CONSTRAINT "EquipmentReservation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentReservation" ADD CONSTRAINT "EquipmentReservation_reservedByCoachId_fkey" FOREIGN KEY ("reservedByCoachId") REFERENCES "Coach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentReservation" ADD CONSTRAINT "EquipmentReservation_linkedFieldAssignmentId_fkey" FOREIGN KEY ("linkedFieldAssignmentId") REFERENCES "FieldAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Complex_locationId_isActive_idx" ON "Complex"("locationId", "isActive");

-- CreateIndex
CREATE INDEX "Field_complexId_isActive_idx" ON "Field"("complexId", "isActive");

-- CreateIndex
CREATE INDEX "ComplexAvailability_complexId_dayOfWeek_isActive_idx" ON "ComplexAvailability"("complexId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "FieldRequest_status_seasonLabel_idx" ON "FieldRequest"("status", "seasonLabel");

-- CreateIndex
CREATE INDEX "FieldRequest_teamId_idx" ON "FieldRequest"("teamId");

-- CreateIndex
CREATE INDEX "FieldRequest_requestedByCoachId_idx" ON "FieldRequest"("requestedByCoachId");

-- CreateIndex
CREATE INDEX "FieldAssignment_fieldId_assignmentDate_idx" ON "FieldAssignment"("fieldId", "assignmentDate");

-- CreateIndex
CREATE INDEX "FieldAssignment_teamId_assignmentDate_idx" ON "FieldAssignment"("teamId", "assignmentDate");

-- CreateIndex
CREATE INDEX "FieldAssignment_recurrenceGroupId_idx" ON "FieldAssignment"("recurrenceGroupId");

-- CreateIndex
CREATE INDEX "FieldAssignment_sourceRequestId_idx" ON "FieldAssignment"("sourceRequestId");

-- CreateIndex
CREATE INDEX "FieldBlackout_complexId_blackoutDate_idx" ON "FieldBlackout"("complexId", "blackoutDate");

-- CreateIndex
CREATE INDEX "FieldBlackout_fieldId_blackoutDate_idx" ON "FieldBlackout"("fieldId", "blackoutDate");

-- CreateIndex
CREATE INDEX "EquipmentItem_locationId_isActive_idx" ON "EquipmentItem"("locationId", "isActive");

-- CreateIndex
CREATE INDEX "EquipmentReservation_equipmentItemId_reservationDate_status_idx" ON "EquipmentReservation"("equipmentItemId", "reservationDate", "status");

-- CreateIndex
CREATE INDEX "EquipmentReservation_teamId_reservationDate_idx" ON "EquipmentReservation"("teamId", "reservationDate");
