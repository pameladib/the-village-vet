import type { AppointmentType, GroomingService, VisitService } from "../../../generated/prisma/client";

export const appointmentTypeLabels: Record<AppointmentType, string> = {
    VETERINARY_VISIT: "Veterinary visit",
    GROOMING: "Grooming",
    OPERATION: "Operation",
};

export const visitServiceLabels: Record<VisitService, string> = {
    CHECKUP: "Check-up",
    VACCINATION: "Vaccination",
    DEWORMING: "Deworming",
    FLEA_TREATMENT: "Flea treatment",
    FOLLOW_UP: "Follow-up",
};

export const visitServiceOrder: VisitService[] = ["CHECKUP", "VACCINATION", "DEWORMING", "FLEA_TREATMENT", "FOLLOW_UP"];

export const groomingServiceLabels: Record<GroomingService, string> = {
    SHOWER: "Shower",
    HAIRCUT: "Haircut",
    BOTH: "Shower and haircut",
};

export function orderedVisitServices(services: VisitService[]) {
    return visitServiceOrder.filter((service) => services.includes(service));
}

export function formatVisitServices(services: VisitService[]) {
    return orderedVisitServices(services).map((service) => visitServiceLabels[service]).join(", ");
}

export function appointmentDetail(type: AppointmentType, services: VisitService[], groomingService?: GroomingService | null) {
    if (type === "GROOMING" && groomingService) return `${appointmentTypeLabels.GROOMING} · ${groomingServiceLabels[groomingService]}`;
    if (type === "VETERINARY_VISIT" && services.length > 0) return `${appointmentTypeLabels.VETERINARY_VISIT} · ${formatVisitServices(services)}`;
    return appointmentTypeLabels[type];
}
