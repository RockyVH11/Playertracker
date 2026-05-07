-- AlterTable
ALTER TABLE "EquipmentItem" ADD COLUMN "concurrentCapacity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "EquipmentReservation" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
