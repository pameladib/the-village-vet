import type { Species, VaccinationType } from "../../../generated/prisma/client";

export const VACCINE_GAP_DAYS = 21;
export const ANNUAL_MONTHS = 11;

export type NextDoseKey = "SECOND" | "THIRD" | "ANNUAL_1" | "ANNUAL_2" | "ANNUAL_3" | "ANNUAL_NEXT";

export type DoseCopyKey =
    | "doseFirst"
    | "doseSecond"
    | "doseThird"
    | "doseAnnual"
    | "doseAnnual1"
    | "doseAnnual2"
    | "doseAnnual3"
    | "doseAnnualLater"
    | "doseAnnualNext"
    | "doseDeworming"
    | "doseFlea";

const copyKeys: Record<string, DoseCopyKey> = {
    FIRST: "doseFirst",
    SECOND: "doseSecond",
    THIRD: "doseThird",
    ANNUAL_1: "doseAnnual1",
    ANNUAL_2: "doseAnnual2",
    ANNUAL_3: "doseAnnual3",
    ANNUAL: "doseAnnualNext",
    ANNUAL_NEXT: "doseAnnualNext",
    DEWORMING: "doseDeworming",
    FLEA_TICK: "doseFlea",
    FLEA_TREATMENT: "doseFlea",
};

export function dateOnlyUtc(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date;
}

export function formatDateOnly(date: Date) {
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function addCalendarDays(date: Date, days: number) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

export function addCalendarMonths(date: Date, months: number) {
    const monthIndex = date.getUTCMonth() + months;
    const day = date.getUTCDate();
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), monthIndex + 1, 0)).getUTCDate();
    return new Date(Date.UTC(date.getUTCFullYear(), monthIndex, Math.min(day, lastDay)));
}

function nextAnnualKey(currentNumber: number): NextDoseKey {
    const next = currentNumber + 1;
    if (next === 2) return "ANNUAL_2";
    if (next === 3) return "ANNUAL_3";
    return "ANNUAL_NEXT";
}

// The next dose follows the dose being recorded. Missing earlier doses are not treated as already given.
export function nextVaccineDue(species: Species, dose: VaccinationType, administeredAt: Date, annualsBefore = 0) {
    if (species === "CAT" && dose === "THIRD") return null;
    if (species === "CAT" && dose === "SECOND") {
        return { dose: "ANNUAL_1" as const, dueAt: addCalendarMonths(administeredAt, ANNUAL_MONTHS) };
    }
    if (species === "DOG" && dose === "THIRD") {
        return { dose: "ANNUAL_1" as const, dueAt: addCalendarMonths(administeredAt, ANNUAL_MONTHS) };
    }
    if (dose === "ANNUAL") {
        const current = Math.max(0, annualsBefore) + 1;
        return { dose: nextAnnualKey(current), dueAt: addCalendarMonths(administeredAt, ANNUAL_MONTHS) };
    }
    if (dose === "FIRST") return { dose: "SECOND" as const, dueAt: addCalendarDays(administeredAt, VACCINE_GAP_DAYS) };
    if (species === "DOG" && dose === "SECOND") return { dose: "THIRD" as const, dueAt: addCalendarDays(administeredAt, VACCINE_GAP_DAYS) };
    return null;
}

export function doseCopyKey(value: string | null | undefined): DoseCopyKey | null {
    if (!value) return null;
    return copyKeys[value] ?? null;
}

export function historyDoseKey(type: VaccinationType, annualNumber: number | null): DoseCopyKey {
    if (type === "ANNUAL") {
        if (annualNumber === 1) return "doseAnnual1";
        if (annualNumber === 2) return "doseAnnual2";
        if (annualNumber === 3) return "doseAnnual3";
        if (annualNumber != null) return "doseAnnualLater";
        return "doseAnnual";
    }
    return copyKeys[type] ?? "doseAnnual";
}

export function annualNumbers<T extends { id: string; type: string; administeredAt: Date | string | null }>(records: T[]) {
    const annuals = records
        .filter((record) => record.type === "ANNUAL" && record.administeredAt)
        .map((record) => ({
            id: record.id,
            time: new Date(record.administeredAt as Date | string).getTime(),
        }))
        .filter((record) => !Number.isNaN(record.time))
        .sort((left, right) => left.time - right.time || left.id.localeCompare(right.id));
    return new Map(annuals.map((record, index) => [record.id, index + 1]));
}

export function availableVaccineDoses(species: Species, recorded: { type: string }[]) {
    const order = species === "DOG"
        ? ["FIRST", "SECOND", "THIRD", "ANNUAL"] as const
        : ["FIRST", "SECOND", "ANNUAL"] as const;
    const used = new Set(recorded.filter((row) => row.type !== "ANNUAL").map((row) => row.type));
    return order.filter((dose) => dose === "ANNUAL" || !used.has(dose));
}

export function doseConflict(
    species: Species,
    existing: { id: string; type: string; administeredAt: string | null }[],
    incoming: { id?: string; type: VaccinationType; administeredAt: string },
) {
    if (species === "CAT" && incoming.type === "THIRD") return "species" as const;
    const others = existing.filter((row) => row.id !== incoming.id);
    if (incoming.type !== "ANNUAL" && others.some((row) => row.type === incoming.type)) return "duplicate" as const;
    if (incoming.type === "ANNUAL" && others.some((row) => row.type === "ANNUAL" && row.administeredAt === incoming.administeredAt)) return "annualDate" as const;
    return null;
}

export type FollowUpPlan =
    | { type: "update"; id: string }
    | { type: "delete"; id: string }
    | { type: "complete"; id: string }
    | { type: "replace"; completeId: string }
    | { type: "create" }
    | { type: "none" };

// A completed reminder stays completed. A new dose completes the previous open reminder, then opens the next one only when a due date was entered.
export function planFollowUp(input: {
    linked: { id: string; open: boolean } | null;
    openForKind: { id: string } | null;
    nextDue: Date | null;
}): FollowUpPlan {
    if (input.linked) {
        if (!input.nextDue) return input.linked.open ? { type: "delete", id: input.linked.id } : { type: "none" };
        return { type: "update", id: input.linked.id };
    }
    if (!input.nextDue) {
        return input.openForKind ? { type: "complete", id: input.openForKind.id } : { type: "none" };
    }
    if (input.openForKind) return { type: "replace", completeId: input.openForKind.id };
    return { type: "create" };
}
