CREATE TABLE "pet_weight" (
    "id" TEXT NOT NULL,
    "weight" DECIMAL(6,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "petId" TEXT NOT NULL,
    "medicalVisitId" TEXT,

    CONSTRAINT "pet_weight_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pet_weight_medicalVisitId_key" ON "pet_weight"("medicalVisitId");
CREATE INDEX "pet_weight_petId_recordedAt_idx" ON "pet_weight"("petId", "recordedAt");

ALTER TABLE "pet_weight" ADD CONSTRAINT "pet_weight_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pet_weight" ADD CONSTRAINT "pet_weight_medicalVisitId_fkey" FOREIGN KEY ("medicalVisitId") REFERENCES "medical_visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
