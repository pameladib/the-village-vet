import type { Species, VaccinationType } from "../../../generated/prisma/client";

export const VACCINE_GAP_DAYS = 21;
export const ANNUAL_MONTHS = 11;

function addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60_000);
}

function addMonths(date: Date, months: number) {
    const next = new Date(date.getTime());
    next.setUTCMonth(next.getUTCMonth() + months);
    return next;
}

// Cats: two doses, three weeks apart, then every 11 months.
// Dogs: three doses, three weeks apart, then every 11 months.
export function nextVaccineDue(species: Species, dose: VaccinationType, administeredAt: Date) {
    if (species === "CAT" && dose === "THIRD") return null;
    if (dose === "ANNUAL" || (species === "CAT" && dose === "SECOND") || (species === "DOG" && dose === "THIRD")) {
        return { dose: "ANNUAL" as const, dueAt: addMonths(administeredAt, ANNUAL_MONTHS) };
    }
    if (dose === "FIRST") return { dose: "SECOND" as const, dueAt: addDays(administeredAt, VACCINE_GAP_DAYS) };
    if (species === "DOG" && dose === "SECOND") return { dose: "THIRD" as const, dueAt: addDays(administeredAt, VACCINE_GAP_DAYS) };
    return null;
}
