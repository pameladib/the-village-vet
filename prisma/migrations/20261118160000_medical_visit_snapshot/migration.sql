ALTER TABLE "medical_visit" ADD COLUMN "type" "AppointmentType" NOT NULL DEFAULT 'VETERINARY_VISIT';
ALTER TABLE "medical_visit" ADD COLUMN "services" "VisitService"[] NOT NULL DEFAULT ARRAY[]::"VisitService"[];
