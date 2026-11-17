CREATE TABLE "clinic_photo" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "storageKey" TEXT NOT NULL,
    "captionEn" TEXT NOT NULL DEFAULT '',
    "captionAr" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinic_photo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinic_photo_storageKey_key" ON "clinic_photo"("storageKey");
CREATE INDEX "clinic_photo_kind_position_idx" ON "clinic_photo"("kind", "position");
