ALTER TABLE "shop_order" ADD COLUMN "fulfillment" TEXT NOT NULL DEFAULT 'PICKUP';
ALTER TABLE "shop_order" ADD COLUMN "deliveryAddress" TEXT;
ALTER TABLE "shop_order" ADD COLUMN "deliveryPhone" TEXT;
ALTER TABLE "shop_order" ADD COLUMN "deliveryNote" TEXT;
