/*
  Warnings:

  - Made the column `sex` on table `pet` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "pet" ALTER COLUMN "sex" SET NOT NULL;
