-- AlterTable
ALTER TABLE "user" ADD COLUMN "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");
