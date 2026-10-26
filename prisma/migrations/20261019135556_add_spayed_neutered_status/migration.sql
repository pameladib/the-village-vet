/*
  Warnings:

  - The `spayedNeutered` column on the `pet` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "spayedNeuteredStatus" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('VACCINATION', 'DEWORMING', 'FLEA_TREATMENT');

-- AlterTable
ALTER TABLE "pet" DROP COLUMN "spayedNeutered",
ADD COLUMN     "spayedNeutered" "spayedNeuteredStatus";

-- CreateTable
CREATE TABLE "health_reminder" (
    "id" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "notifyAt" TIMESTAMP(3) NOT NULL,
    "petId" TEXT NOT NULL,
    "vaccinationId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "health_reminder_vaccinationId_key" ON "health_reminder"("vaccinationId");

-- CreateIndex
CREATE UNIQUE INDEX "health_reminder_treatmentId_key" ON "health_reminder"("treatmentId");

-- CreateIndex
CREATE INDEX "health_reminder_petId_dueAt_idx" ON "health_reminder"("petId", "dueAt");

-- AddForeignKey
ALTER TABLE "health_reminder" ADD CONSTRAINT "health_reminder_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_reminder" ADD CONSTRAINT "health_reminder_vaccinationId_fkey" FOREIGN KEY ("vaccinationId") REFERENCES "vaccination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_reminder" ADD CONSTRAINT "health_reminder_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "treatment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
