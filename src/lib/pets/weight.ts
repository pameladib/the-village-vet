import { beirutInstant, calendarDateInBeirut, todayInBeirut } from "../appointments/availability";

const weightPattern = /^\d{1,3}(\.\d{1,3})?$/;

// Blank means no measurement. Stored as kilograms, with three decimal places so one gram is kept.
export function parseWeightKg(raw: string): string | null | "invalid" {
    const value = raw.trim();
    if (!value) return null;
    if (!weightPattern.test(value)) return "invalid";
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0 || number > 999.999) return "invalid";
    return number.toFixed(3);
}

// The pet form stores grams. History keeps kilograms, so 347 g becomes 0.347 kg.
export function petWeightFromGrams(grams: number): string | null {
    if (!Number.isInteger(grams) || grams <= 0) return null;
    const kilograms = grams / 1000;
    if (kilograms > 999.999) return null;
    return kilograms.toFixed(3);
}

export function historyWeightsFromRecords(
    records: { weightGrams: number; recordedAt: Date }[],
    existing: { weight: string; recordedAt: Date }[],
) {
    const seen = new Map<string, number[]>();
    for (const row of existing) {
        const date = calendarDateInBeirut(row.recordedAt);
        const grams = Math.round(Number(row.weight) * 1000);
        seen.set(date, [...(seen.get(date) ?? []), grams]);
    }
    const missing: { weight: string; recordedAt: Date }[] = [];
    for (const record of records) {
        const weight = petWeightFromGrams(record.weightGrams);
        if (!weight) continue;
        const date = calendarDateInBeirut(record.recordedAt);
        const grams = Math.round(Number(weight) * 1000);
        const covered = (seen.get(date) ?? []).some((saved) => Math.abs(saved - grams) <= 5);
        if (covered) continue;
        seen.set(date, [...(seen.get(date) ?? []), grams]);
        missing.push({ weight, recordedAt: record.recordedAt });
    }
    return missing;
}

export function formatWeightKg(stored: string) {
    const parsed = parseWeightKg(stored);
    if (parsed === "invalid" || parsed === null) return stored;
    return parsed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

// Under 1 kg the history shows grams. A heavier weight stays in kilograms.
export function formatHistoryWeight(stored: string): { amount: string; unit: "kg" | "g" } {
    const parsed = parseWeightKg(stored);
    if (parsed === "invalid" || parsed === null) return { amount: stored, unit: "kg" };
    const kilograms = Number(parsed);
    if (kilograms < 1) return { amount: String(Math.round(kilograms * 1000)), unit: "g" };
    return { amount: formatWeightKg(stored), unit: "kg" };
}

// Noon in Beirut, so the calendar date stays on the day the clinic chose. Future dates are refused.
export function weightInstant(date: string, now = new Date()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayInBeirut(now)) return null;
    try {
        return beirutInstant(date, 12, 0);
    } catch {
        return null;
    }
}

export function weightNotes(raw: string): string | null | "invalid" {
    const notes = raw.trim();
    if (notes.length > 1000) return "invalid";
    return notes || null;
}

export type VisitWeightPlan =
    | { action: "none" }
    | { action: "delete" }
    | { action: "invalid" }
    | { action: "create"; weight: string }
    | { action: "update"; weight: string };

// One visit has one measurement. Clearing the field removes it. Editing it updates the same row.
export function visitWeightPlan(hasMeasurement: boolean, raw: string): VisitWeightPlan {
    const parsed = parseWeightKg(raw);
    if (parsed === "invalid") return { action: "invalid" };
    if (parsed === null) return hasMeasurement ? { action: "delete" } : { action: "none" };
    return hasMeasurement ? { action: "update", weight: parsed } : { action: "create", weight: parsed };
}

export function weightFollowsVisit(recordedAt: Date, visitedAt: Date) {
    return calendarDateInBeirut(recordedAt) === calendarDateInBeirut(visitedAt);
}
