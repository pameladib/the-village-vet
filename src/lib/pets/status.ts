import { dateOnlyUtc } from "../clinic/vaccines";

// Living pets that are still on the active lists. Archived and deceased pets are separate statuses.
export const activePet = { status: "ACTIVE" as const };

export function isOperablePet(pet: { status: string }) {
    return pet.status === "ACTIVE";
}

export function canRestoreArchivedPet(pet: { status: string }) {
    return pet.status === "ARCHIVED";
}

// An empty value means the day is unknown. A future day or a value that is not a date is refused.
export function optionalDeceasedDay(value: string, today: string): { ok: true; date: Date | null } | { ok: false } {
    const trimmed = value.trim();
    if (!trimmed) return { ok: true, date: null };
    const date = deceasedDay(trimmed, today);
    if (!date) return { ok: false };
    return { ok: true, date };
}

export function deceasedDay(value: string, today: string) {
    const date = dateOnlyUtc(value);
    if (!date || value > today) return null;
    return date;
}
