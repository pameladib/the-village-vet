-- Sample shop products are removed so the clinic can enter its own catalog.
-- Orders of those products are removed with them, because each line points at a product.

DELETE FROM "stock_movement";
DELETE FROM "order_item";
DELETE FROM "shop_order";
DELETE FROM "product";

ALTER TABLE "product" DROP COLUMN "price";
ALTER TABLE "product" DROP COLUMN "stock";
ALTER TABLE "product" DROP COLUMN "lowStockAt";

CREATE TABLE "product_variant" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "labelAr" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "lowStockAt" INTEGER NOT NULL DEFAULT 2,
    "position" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,

    CONSTRAINT "product_variant_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_variant_productId_position_idx" ON "product_variant"("productId", "position");

ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_movement" DROP CONSTRAINT "stock_movement_productId_fkey";
DROP INDEX "stock_movement_productId_createdAt_idx";
ALTER TABLE "stock_movement" DROP COLUMN "productId";
ALTER TABLE "stock_movement" ADD COLUMN "variantId" TEXT NOT NULL;

CREATE INDEX "stock_movement_variantId_createdAt_idx" ON "stock_movement"("variantId", "createdAt");

ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_item" ADD COLUMN "variantId" TEXT NOT NULL;
ALTER TABLE "order_item" ADD COLUMN "variantLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "order_item" ADD COLUMN "variantLabelAr" TEXT NOT NULL DEFAULT '';

CREATE INDEX "order_item_variantId_idx" ON "order_item"("variantId");

ALTER TABLE "order_item" ADD CONSTRAINT "order_item_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
