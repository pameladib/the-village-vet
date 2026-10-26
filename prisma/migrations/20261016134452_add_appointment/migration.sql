-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CHECKUP', 'VACCINATION', 'TREATMENT', 'GROOMING', 'OPERATION');

-- CreateTable
CREATE TABLE "appointment" (
    "id" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "ownerId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_ownerId_startAt_idx" ON "appointment"("ownerId", "startAt");

-- CreateIndex
CREATE INDEX "appointment_petId_startAt_idx" ON "appointment"("petId", "startAt");

-- CreateIndex
CREATE INDEX "appointment_startAt_idx" ON "appointment"("startAt");

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
