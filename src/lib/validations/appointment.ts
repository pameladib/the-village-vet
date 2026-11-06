import { z } from "zod";

const appointmentTypes = ["CHECKUP", "VACCINATION", "TREATMENT", "GROOMING", "OPERATION", "FOLLOW_UP"] as const;

// start is the slot instant from getAvailableStarts, sent as an ISO string.
// The day stays separate so the action can load that clinic date.
const bookingFields = z.object({
  petId: z.uuid({ message: "Choose a pet" }),
  type: z.enum(appointmentTypes, { message: "Choose an appointment type" }),
  date: z.iso.date({ message: "Choose a valid date" }),
  start: z.iso.datetime({ message: "Choose a time" }),
  groomingService: z.enum(["SHOWER", "HAIRCUT", "BOTH"]).optional(),
});

export const bookingSchema = bookingFields.superRefine((value, context) => {
  if (value.type === "GROOMING" && !value.groomingService) {
    context.addIssue({
      code: "custom",
      path: ["groomingService"],
      message: "Choose a grooming service",
    });
  }
});

// Showing times does not require a chosen start yet. Pick happens before the grooming check, because Zod will not pick from a refined schema.
export const openingsSchema = bookingFields.pick({ petId: true, type: true, date: true });

export type BookingForm = z.infer<typeof bookingSchema>;
