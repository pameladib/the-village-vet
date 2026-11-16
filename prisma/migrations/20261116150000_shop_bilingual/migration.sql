ALTER TABLE "product_category" ADD COLUMN "nameAr" TEXT;
ALTER TABLE "product_category" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

UPDATE "product_category" SET "nameAr" = CASE "name"
    WHEN 'Dog food' THEN 'طعام الكلاب'
    WHEN 'Cat food' THEN 'طعام القطط'
    WHEN 'Dog accessories and toys' THEN 'إكسسوارات الكلاب وألعابها'
    WHEN 'Cat accessories' THEN 'إكسسوارات القطط'
    WHEN 'Ruminant products' THEN 'المجترات'
    WHEN 'Medication and veterinary products' THEN 'أدوية'
    ELSE "name"
END,
"position" = CASE "name"
    WHEN 'Dog food' THEN 1
    WHEN 'Cat food' THEN 2
    WHEN 'Dog accessories and toys' THEN 3
    WHEN 'Cat accessories' THEN 4
    WHEN 'Ruminant products' THEN 5
    WHEN 'Medication and veterinary products' THEN 6
    ELSE "position"
END;

UPDATE "product_category" SET "nameAr" = "name" WHERE "nameAr" IS NULL;
ALTER TABLE "product_category" ALTER COLUMN "nameAr" SET NOT NULL;

ALTER TABLE "product" ADD COLUMN "nameAr" TEXT;
ALTER TABLE "product" ADD COLUMN "descriptionAr" TEXT;

UPDATE "product" SET
    "nameAr" = CASE "id"
        WHEN '11111111-1111-4111-8111-111111110001' THEN 'طعام دجاج للكلاب البالغة، ٣ كغ'
        WHEN '11111111-1111-4111-8111-111111110002' THEN 'وجبة لحم للجراء، ٢ كغ'
        WHEN '22222222-2222-4222-8222-222222220001' THEN 'طعام سلمون للقطط المنزلية، ٢ كغ'
        WHEN '22222222-2222-4222-8222-222222220002' THEN 'أكياس دجاج للقطط الصغيرة، ١٢ كيساً'
        WHEN '33333333-3333-4333-8333-333333330001' THEN 'حبل قطن للشد'
        WHEN '33333333-3333-4333-8333-333333330002' THEN 'مقود نايلون يومي'
        WHEN '44444444-4444-4444-8444-444444440001' THEN 'عصا الريش'
        WHEN '44444444-4444-4444-8444-444444440002' THEN 'عمود خدش من السيزال'
        WHEN '55555555-5555-4555-8555-555555550001' THEN 'قالب ملح معدني'
        WHEN '55555555-5555-4555-8555-555555550002' THEN 'علف حبوب مشكل، ١٠ كغ'
        WHEN '66666666-6666-4666-8666-666666660001' THEN 'قطرة براغيث للكلاب'
        WHEN '66666666-6666-4666-8666-666666660002' THEN 'أقراص علاج الديدان'
        ELSE "name"
    END,
    "descriptionAr" = CASE "id"
        WHEN '11111111-1111-4111-8111-111111110001' THEN 'طعام دجاج يومي للكلاب البالغة.'
        WHEN '11111111-1111-4111-8111-111111110002' THEN 'كيس أصغر للجراء في طور النمو.'
        WHEN '22222222-2222-4222-8222-222222220001' THEN 'طعام سلمون للقطط التي تعيش في المنزل.'
        WHEN '22222222-2222-4222-8222-222222220002' THEN 'وجبات طرية للقطط الصغيرة.'
        WHEN '33333333-3333-4333-8333-333333330001' THEN 'حبل قطن معقود للعب الشد.'
        WHEN '33333333-3333-4333-8333-333333330002' THEN 'مقود كحلي للنزهات اليومية.'
        WHEN '44444444-4444-4444-8444-444444440001' THEN 'عصا ريش للعب قصير.'
        WHEN '44444444-4444-4444-8444-444444440002' THEN 'عمود صغير ملفوف بالسيزال.'
        WHEN '55555555-5555-4555-8555-555555550001' THEN 'قالب ملح للماعز والخراف.'
        WHEN '55555555-5555-4555-8555-555555550002' THEN 'كيس علف حبوب للمجترات.'
        WHEN '66666666-6666-4666-8666-666666660001' THEN 'قطرة تُحفظ في العيادة.'
        WHEN '66666666-6666-4666-8666-666666660002' THEN 'أقراص يمكن تسليمها مع الزيارة.'
        ELSE "descriptionAr"
    END;

UPDATE "product" SET "nameAr" = "name" WHERE "nameAr" IS NULL;
ALTER TABLE "product" ALTER COLUMN "nameAr" SET NOT NULL;
