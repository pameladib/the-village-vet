import type { AppointmentGetPayload, AppointmentInclude } from "../../../generated/prisma/models/Appointment";

export const appointmentWithPetInclude = {
    pet: {
        select: {
            id: true,
            slug: true,
            name: true,
            species: true,
            photoUrl: true,
        },
    },
} as const satisfies AppointmentInclude;

export type AppointmentWithPet = AppointmentGetPayload<{
    include: typeof appointmentWithPetInclude;
}>;
