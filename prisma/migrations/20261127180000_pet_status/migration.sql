-- CreateEnum
CREATE TYPE "PetStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "pet" ADD COLUMN "status" "PetStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "pet" ADD COLUMN "deceasedAt" TIMESTAMP(3);
