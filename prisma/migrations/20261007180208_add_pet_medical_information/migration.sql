-- CreateEnum
CREATE TYPE "TreatmentType" AS ENUM ('DEWORMING', 'FLEA_TICK');

-- AlterTable
ALTER TABLE "pet" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "breed" TEXT,
ADD COLUMN     "diet" TEXT,
ADD COLUMN     "medicalConditions" TEXT,
ADD COLUMN     "medications" TEXT,
ADD COLUMN     "previousHistory" TEXT,
ADD COLUMN     "spayedNeutered" BOOLEAN,
ADD COLUMN     "spayedNeuteredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vaccination" ALTER COLUMN "administeredAt" DROP NOT NULL;

-- CreateTable
CREATE TABLE "treatment" (
    "id" TEXT NOT NULL,
    "type" "TreatmentType" NOT NULL,
    "administeredAt" TIMESTAMP(3),
    "petId" TEXT NOT NULL,

    CONSTRAINT "treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_visit" (
    "id" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "petId" TEXT NOT NULL,

    CONSTRAINT "medical_visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "treatment_petId_idx" ON "treatment"("petId");

-- CreateIndex
CREATE INDEX "medical_visit_petId_idx" ON "medical_visit"("petId");

-- AddForeignKey
ALTER TABLE "treatment" ADD CONSTRAINT "treatment_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_visit" ADD CONSTRAINT "medical_visit_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
