-- CreateEnum
CREATE TYPE "BlockScope" AS ENUM ('CLINIC', 'GROOMING', 'BOTH');

-- AlterTable
ALTER TABLE "schedule_block" ADD COLUMN "scope" "BlockScope";

-- Existing blocks were created before a scope existed. Closing both calendars preserves the old behavior.
UPDATE "schedule_block" SET "scope" = 'BOTH' WHERE "scope" IS NULL;

ALTER TABLE "schedule_block" ALTER COLUMN "scope" SET NOT NULL;

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('BOOKED', 'CANCELLED');

-- AlterTable
ALTER TABLE "appointment" ADD COLUMN "status" "AppointmentStatus" NOT NULL DEFAULT 'BOOKED';

-- CreateEnum
CREATE TYPE "GroomingService" AS ENUM ('SHOWER', 'HAIRCUT', 'BOTH');

-- AlterTable
ALTER TABLE "appointment" ADD COLUMN "groomingService" "GroomingService";

-- AlterEnum
ALTER TYPE "AppointmentType" ADD VALUE 'FOLLOW_UP';

-- CreateIndex
CREATE INDEX "appointment_status_startAt_idx" ON "appointment"("status", "startAt");
