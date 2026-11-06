-- CreateTable
CREATE TABLE "schedule_block" (
    "id" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_block_startAt_endAt_idx" ON "schedule_block"("startAt", "endAt");

-- AddForeignKey
ALTER TABLE "schedule_block" ADD CONSTRAINT "schedule_block_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
