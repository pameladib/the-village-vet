ALTER TABLE "shop_order" ALTER COLUMN "ownerId" DROP NOT NULL;

ALTER TABLE "shop_order"
    ADD COLUMN "customerName" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "customerPhone" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "createdById" TEXT,
    ADD COLUMN "paidAt" TIMESTAMP(3);

-- Keep the buyer on the order itself. A later change to the account does not rewrite this sale.
UPDATE "shop_order" AS o
SET "customerName" = u."name",
    "customerPhone" = u."phoneNumber"
FROM "user" AS u
WHERE o."ownerId" = u."id";

ALTER TABLE "shop_order"
    ADD CONSTRAINT "shop_order_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "shop_order_createdById_idx" ON "shop_order"("createdById");
