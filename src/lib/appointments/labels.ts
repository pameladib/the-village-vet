import type { AppointmentType, GroomingService, VisitService } from "../../../generated/prisma/client";
import type { Copy } from "@/lib/i18n";

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

export function formatVisitServices(services: VisitService[], copy?: Copy) {
    const labels = copy ? visitServices(copy) : visitServiceLabels;
    return orderedVisitServices(services).map((service) => labels[service]).join(", ");
}

export function visitServices(copy: Copy): Record<VisitService, string> {
    return {
        CHECKUP: copy.svcCheckup,
        VACCINATION: copy.svcVaccination,
        DEWORMING: copy.svcDeworming,
        FLEA_TREATMENT: copy.svcFlea,
        FOLLOW_UP: copy.svcFollowUp,
    };
}

export function groomingServices(copy: Copy): Record<GroomingService, string> {
    return {
        SHOWER: copy.groomShower,
        HAIRCUT: copy.groomHaircut,
        BOTH: copy.groomBoth,
    };
}

export function appointmentTypes(copy: Copy): Record<AppointmentType, string> {
    return {
        VETERINARY_VISIT: copy.typeVisit,
        GROOMING: copy.typeGrooming,
        OPERATION: copy.typeOperation,
    };
}

export function appointmentDetail(type: AppointmentType, services: VisitService[], groomingService?: GroomingService | null, copy?: Copy) {
    const types = copy ? appointmentTypes(copy) : appointmentTypeLabels;
    const grooming = copy ? groomingServices(copy) : groomingServiceLabels;
    if (type === "GROOMING" && groomingService) return `${types.GROOMING} · ${grooming[groomingService]}`;
    if (type === "VETERINARY_VISIT" && services.length > 0) return `${types.VETERINARY_VISIT} · ${formatVisitServices(services, copy)}`;
    return types[type];
}
