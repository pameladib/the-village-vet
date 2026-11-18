import type { AppointmentType } from "../../../generated/prisma/client";

export function isClinicalAppointment(type: AppointmentType) {
    return type === "VETERINARY_VISIT" || type === "OPERATION";
}

export function awaitingRecord(status: string, startAt: Date, now: Date) {
    return status === "BOOKED" && startAt.getTime() < now.getTime();
}

export function canCompleteClinical(status: string, type: AppointmentType) {
    return status === "BOOKED" && isClinicalAppointment(type);
}

export function canMarkGroomingDone(status: string, type: AppointmentType) {
    return status === "BOOKED" && type === "GROOMING";
}

export function canMarkMissed(status: string, startAt: Date, now: Date) {
    return awaitingRecord(status, startAt, now);
}
