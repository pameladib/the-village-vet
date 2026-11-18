CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

CREATE TABLE "visit_follow_up" (
    "id" TEXT NOT NULL,
    "dueOn" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "petId" TEXT NOT NULL,
    "medicalVisitId" TEXT NOT NULL,

    CONSTRAINT "visit_follow_up_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "visit_follow_up_medicalVisitId_key" ON "visit_follow_up"("medicalVisitId");
CREATE INDEX "visit_follow_up_status_dueOn_idx" ON "visit_follow_up"("status", "dueOn");
CREATE INDEX "visit_follow_up_petId_idx" ON "visit_follow_up"("petId");

ALTER TABLE "visit_follow_up" ADD CONSTRAINT "visit_follow_up_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visit_follow_up" ADD CONSTRAINT "visit_follow_up_medicalVisitId_fkey" FOREIGN KEY ("medicalVisitId") REFERENCES "medical_visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
