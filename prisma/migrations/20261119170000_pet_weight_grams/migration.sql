-- Three decimal places so 0.347 kg is 347 g, not rounded to the nearest 10 g.
ALTER TABLE "pet_weight" ALTER COLUMN "weight" SET DATA TYPE DECIMAL(7,3);
