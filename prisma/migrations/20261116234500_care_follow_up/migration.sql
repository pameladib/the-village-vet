ALTER TABLE "vaccination" ADD COLUMN "followUpCleared" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "treatment" ADD COLUMN "followUpCleared" BOOLEAN NOT NULL DEFAULT false;
