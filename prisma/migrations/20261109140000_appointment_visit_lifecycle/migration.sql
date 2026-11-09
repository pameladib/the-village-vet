-- CreateEnum
CREATE TYPE "VisitService" AS ENUM ('CHECKUP', 'VACCINATION', 'DEWORMING', 'FLEA_TREATMENT', 'FOLLOW_UP');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'EXPIRED';

-- AlterEnum
BEGIN;
CREATE TYPE "AppointmentType_new" AS ENUM ('VETERINARY_VISIT', 'GROOMING', 'OPERATION');
ALTER TABLE "appointment" ALTER COLUMN "type" TYPE "AppointmentType_new" USING (
  CASE "type"::text
    WHEN 'GROOMING' THEN 'GROOMING'
    WHEN 'OPERATION' THEN 'OPERATION'
    ELSE 'VETERINARY_VISIT'
  END::"AppointmentType_new"
);
ALTER TYPE "AppointmentType" RENAME TO "AppointmentType_old";
ALTER TYPE "AppointmentType_new" RENAME TO "AppointmentType";
DROP TYPE "public"."AppointmentType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "health_reminder" DROP CONSTRAINT "health_reminder_petId_fkey";

-- DropForeignKey
ALTER TABLE "health_reminder" DROP CONSTRAINT "health_reminder_treatmentId_fkey";

-- DropForeignKey
ALTER TABLE "health_reminder" DROP CONSTRAINT "health_reminder_vaccinationId_fkey";

-- DropIndex
DROP INDEX "appointment_startAt_idx";

-- AlterTable
ALTER TABLE "appointment" ADD COLUMN     "services" "VisitService"[] NOT NULL DEFAULT ARRAY[]::"VisitService"[];

-- AlterTable
ALTER TABLE "clinic_setting" ALTER COLUMN "id" SET DEFAULT 'clinic';

-- AlterTable
ALTER TABLE "medical_visit" ADD COLUMN     "appointmentId" TEXT;

-- AlterTable
ALTER TABLE "treatment" ADD COLUMN     "medicalVisitId" TEXT;

-- AlterTable
ALTER TABLE "vaccination" ADD COLUMN     "medicalVisitId" TEXT;

-- DropTable
DROP TABLE "health_reminder";

-- CreateIndex
CREATE UNIQUE INDEX "care_reminder_vaccinationId_key" ON "care_reminder"("vaccinationId");

-- CreateIndex
CREATE UNIQUE INDEX "care_reminder_treatmentId_key" ON "care_reminder"("treatmentId");

-- CreateIndex
CREATE UNIQUE INDEX "care_reminder_one_open_per_kind" ON "care_reminder"("petId", "kind") WHERE ("completedAt" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "medical_visit_appointmentId_key" ON "medical_visit"("appointmentId");

-- CreateIndex
CREATE INDEX "treatment_medicalVisitId_idx" ON "treatment"("medicalVisitId");

-- CreateIndex
CREATE INDEX "vaccination_medicalVisitId_idx" ON "vaccination"("medicalVisitId");

-- AddForeignKey
ALTER TABLE "treatment" ADD CONSTRAINT "treatment_medicalVisitId_fkey" FOREIGN KEY ("medicalVisitId") REFERENCES "medical_visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination" ADD CONSTRAINT "vaccination_medicalVisitId_fkey" FOREIGN KEY ("medicalVisitId") REFERENCES "medical_visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_visit" ADD CONSTRAINT "medical_visit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_reminder" ADD CONSTRAINT "care_reminder_vaccinationId_fkey" FOREIGN KEY ("vaccinationId") REFERENCES "vaccination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_reminder" ADD CONSTRAINT "care_reminder_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "treatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
