ALTER TABLE "clinic_setting"
    ADD COLUMN "priceCurrency" TEXT NOT NULL DEFAULT 'USD',
    ADD COLUMN "usdRate" INTEGER NOT NULL DEFAULT 89500;

-- Existing product prices are whole Lebanese pounds. The primary currency starts as USD,
-- so convert those mock prices into cents at 89,500 LBP per dollar.
UPDATE "product"
SET "price" = CAST(ROUND("price" * 100.0 / 89500) AS INTEGER);

ALTER TABLE "shop_order"
    ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'LBP',
    ADD COLUMN "exchangeRate" INTEGER NOT NULL DEFAULT 89500;
