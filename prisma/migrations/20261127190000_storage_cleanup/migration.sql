CREATE TABLE "storage_cleanup" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_cleanup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "storage_cleanup_bucket_objectKey_key" ON "storage_cleanup"("bucket", "objectKey");
CREATE INDEX "storage_cleanup_petId_idx" ON "storage_cleanup"("petId");
