import { beirutInstant, calendarDateInBeirut, todayInBeirut } from "./availability";

export type UpcomingWhen = "all" | "tomorrow" | "week" | "date";

export type UpcomingSpan = "all" | "choose" | { from: string; to: string };

function shiftDate(date: string, days: number) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function tomorrowInBeirut(now = new Date()) {
    return shiftDate(todayInBeirut(now), 1);
}

// Tomorrow is one day. Next 7 days runs from tomorrow through the sixth day after it.
export function upcomingSpan(when: UpcomingWhen, date: string | null, now = new Date()): UpcomingSpan {
    if (when === "all") return "all";
    const tomorrow = tomorrowInBeirut(now);
    if (when === "tomorrow") return { from: tomorrow, to: tomorrow };
    if (when === "week") return { from: tomorrow, to: shiftDate(tomorrow, 6) };
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= tomorrow) return { from: date, to: date };
    return "choose";
}

export function spanBounds(span: { from: string; to: string }) {
    return {
        start: beirutInstant(span.from, 0, 0),
        end: beirutInstant(shiftDate(span.to, 1), 0, 0),
    };
}

export function filterUpcoming<T extends { startAt: Date }>(visits: T[], span: UpcomingSpan) {
    if (span === "all") return visits;
    if (span === "choose") return [];
    return visits.filter((visit) => {
        const day = calendarDateInBeirut(visit.startAt);
        return day >= span.from && day <= span.to;
    });
}
