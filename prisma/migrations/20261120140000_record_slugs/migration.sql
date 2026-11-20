-- Name-based addresses for pets and products. Filled in by the app after this column exists.
ALTER TABLE "pet" ADD COLUMN "slug" TEXT;
ALTER TABLE "product" ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "pet_slug_key" ON "pet"("slug");
CREATE UNIQUE INDEX "product_slug_key" ON "product"("slug");
