-- Care reminders are separate from health_reminder, which still requires both a vaccine and a treatment.

CREATE TABLE "care_reminder" (
    "id" TEXT NOT NULL,
    "kind" "ReminderType" NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "overridden" BOOLEAN NOT NULL DEFAULT false,
    "dose" TEXT,
    "petId" TEXT NOT NULL,
    "vaccinationId" TEXT,
    "treatmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "care_reminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "care_reminder_petId_dueAt_idx" ON "care_reminder"("petId", "dueAt");
CREATE INDEX "care_reminder_dueAt_completedAt_idx" ON "care_reminder"("dueAt", "completedAt");
ALTER TABLE "care_reminder" ADD CONSTRAINT "care_reminder_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "dedupeKey" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_dedupeKey_key" ON "notification"("dedupeKey");
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "clinic_setting" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "address" TEXT,
    "mapsUrl" TEXT,
    "emergencyPhone" TEXT,
    "about" TEXT,
    CONSTRAINT "clinic_setting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "clinic_setting" ("id") VALUES ('clinic');

CREATE TABLE "medical_document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medical_document_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "medical_document_petId_idx" ON "medical_document"("petId");
ALTER TABLE "medical_document" ADD CONSTRAINT "medical_document_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "product_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "product_category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_category_name_key" ON "product_category"("name");

INSERT INTO "product_category" ("id", "name") VALUES
    ('11111111-1111-4111-8111-111111111111', 'Dog food'),
    ('22222222-2222-4222-8222-222222222222', 'Cat food'),
    ('33333333-3333-4333-8333-333333333333', 'Dog accessories and toys'),
    ('44444444-4444-4444-8444-444444444444', 'Cat accessories'),
    ('55555555-5555-4555-8555-555555555555', 'Ruminant products'),
    ('66666666-6666-4666-8666-666666666666', 'Medication and veterinary products');

CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_categoryId_idx" ON "product"("categoryId");
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TYPE "ShopOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');

CREATE TABLE "shop_order" (
    "id" TEXT NOT NULL,
    "status" "ShopOrderStatus" NOT NULL DEFAULT 'PENDING',
    "payment" TEXT NOT NULL DEFAULT 'CASH_ON_DELIVERY',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shop_order_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shop_order_ownerId_createdAt_idx" ON "shop_order"("ownerId", "createdAt");
CREATE INDEX "shop_order_status_idx" ON "shop_order"("status");
ALTER TABLE "shop_order" ADD CONSTRAINT "shop_order_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "order_item" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_item_orderId_idx" ON "order_item"("orderId");
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "shop_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
