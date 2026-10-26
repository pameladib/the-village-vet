-- DropIndex
DROP INDEX "user_phoneNumber_key";

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'OWNER';
