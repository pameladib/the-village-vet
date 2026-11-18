ALTER TABLE "shop_order"
    ADD COLUMN "approvedAt" TIMESTAMP(3),
    ADD COLUMN "outForDeliveryAt" TIMESTAMP(3),
    ADD COLUMN "readyForPickupAt" TIMESTAMP(3),
    ADD COLUMN "completedAt" TIMESTAMP(3),
    ADD COLUMN "rejectedAt" TIMESTAMP(3),
    ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Preparing is no longer a step. Those orders were already accepted, so they continue as approved.
UPDATE "shop_order"
SET "status" = 'APPROVED',
    "approvedAt" = COALESCE("approvedAt", "updatedAt")
WHERE "status" = 'PREPARING';

UPDATE "shop_order" SET "approvedAt" = "updatedAt" WHERE "status" = 'APPROVED' AND "approvedAt" IS NULL;
UPDATE "shop_order" SET "outForDeliveryAt" = "updatedAt" WHERE "status" = 'OUT_FOR_DELIVERY' AND "outForDeliveryAt" IS NULL;
UPDATE "shop_order" SET "completedAt" = "updatedAt" WHERE "status" = 'FULFILLED' AND "completedAt" IS NULL;
UPDATE "shop_order" SET "rejectedAt" = "updatedAt" WHERE "status" = 'REJECTED' AND "rejectedAt" IS NULL;
