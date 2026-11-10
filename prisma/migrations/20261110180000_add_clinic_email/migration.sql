ALTER TABLE "clinic_setting" ADD COLUMN "email" TEXT;

-- Fill only the details that are still empty, so a value already saved in clinic settings stays as it is.
UPDATE "clinic_setting"
SET
    "email" = COALESCE(NULLIF("email", ''), 'thevillagevet.lb@gmail.com'),
    "phone" = COALESCE(NULLIF("phone", ''), '+961 76 663 557'),
    "whatsapp" = COALESCE(NULLIF("whatsapp", ''), '+961 76 663 557'),
    "address" = COALESCE(NULLIF("address", ''), 'Kfar Habou - Danniyeh'),
    "mapsUrl" = COALESCE(NULLIF("mapsUrl", ''), 'https://maps.app.goo.gl/VgbXYipPXhcg4y8i8')
WHERE "id" = 'clinic';
