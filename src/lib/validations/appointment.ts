import { z } from "zod";

const appointmentTypes = ["VETERINARY_VISIT", "GROOMING", "OPERATION"] as const;
const visitServices = ["CHECKUP", "VACCINATION", "DEWORMING", "FLEA_TREATMENT", "FOLLOW_UP"] as const;

function isClinicDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function isInstant(value: string) {
    return value.includes("T") && !Number.isNaN(Date.parse(value));
}

// Date and time stay plain strings here so every missing field is reported together.
// A strict date check would stop the later service and grooming checks from running.
const bookingFields = z.object({
    petId: z.string(),
    type: z.enum(appointmentTypes, { message: "Choose an appointment type." }),
    services: z.array(z.enum(visitServices)),
    date: z.string(),
    start: z.string(),
    groomingService: z.enum(["SHOWER", "HAIRCUT", "BOTH"]).optional(),
});

export const bookingSchema = bookingFields.superRefine((value, context) => {
    if (!z.uuid().safeParse(value.petId).success) {
        context.addIssue({ code: "custom", path: ["petId"], message: "Choose a pet." });
    }
    if (!value.date) {
        context.addIssue({ code: "custom", path: ["date"], message: "Choose a date." });
    } else if (!isClinicDate(value.date)) {
        context.addIssue({ code: "custom", path: ["date"], message: "Choose a valid date." });
    }
    if (!value.start) {
        context.addIssue({ code: "custom", path: ["start"], message: "Choose a time." });
    } else if (!isInstant(value.start)) {
        context.addIssue({ code: "custom", path: ["start"], message: "Choose a valid time." });
    }
    if (value.type === "VETERINARY_VISIT" && value.services.length === 0) {
        context.addIssue({
            code: "custom",
            path: ["services"],
            message: "Choose at least one service.",
        });
    }
    if (value.type !== "VETERINARY_VISIT" && value.services.length > 0) {
        context.addIssue({
            code: "custom",
            path: ["services"],
            message: "Services belong on a veterinary visit.",
        });
    }
    if (value.type === "GROOMING" && !value.groomingService) {
        context.addIssue({
            code: "custom",
            path: ["groomingService"],
            message: "Choose a grooming service.",
        });
    }
});

// Times can load before a slot or a grooming choice is picked.
export const openingsSchema = z.object({
    petId: z.uuid({ message: "Choose a pet." }),
    type: z.enum(appointmentTypes, { message: "Choose an appointment type." }),
    date: z.iso.date({ message: "Choose a valid date." }),
    exceptAppointmentId: z.uuid().optional(),
});

export type BookingForm = z.infer<typeof bookingSchema>;
