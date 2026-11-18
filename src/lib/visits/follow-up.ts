import { careTiming, todayInBeirut } from "../appointments/availability";
import { dateOnlyUtc } from "../clinic/vaccines";
import { ownerChat } from "../clinic/phone";

export type FollowUpStatus = "PENDING" | "COMPLETED" | "CANCELLED";

export type FollowUpRow = {
    status: FollowUpStatus;
    dueOn: Date;
};

export function outstandingFollowUps<T extends FollowUpRow>(rows: T[], now = new Date()) {
    return rows
        .filter((row) => row.status === "PENDING" && careTiming(row.dueOn, now) !== "upcoming")
        .sort((left, right) => left.dueOn.getTime() - right.dueOn.getTime());
}

export type FollowUpTiming = "overdue" | "due" | "upcoming";

export function followUpBuckets<T extends FollowUpRow>(rows: T[], now = new Date()) {
    const groups: Record<FollowUpTiming, T[]> = { overdue: [], due: [], upcoming: [] };
    for (const row of rows) {
        if (row.status !== "PENDING") continue;
        const timing = careTiming(row.dueOn, now);
        groups[timing].push(row);
    }
    for (const timing of ["overdue", "due", "upcoming"] as const) {
        groups[timing].sort((left, right) => left.dueOn.getTime() - right.dueOn.getTime());
    }
    return groups;
}

// The dashboard card and the sidebar badge count reminders that need attention now.
export function attentionFollowUpCount(counts: { overdue: number; due: number }) {
    return counts.overdue + counts.due;
}

// Follow-up dates are stored at UTC midnight, which is the same Beirut calendar day.
export function followUpDueThrough(now = new Date()) {
    return dateOnlyUtc(todayInBeirut(now));
}

export function followUpAttention(
    counts: { overdue: number; due: number; upcoming: number },
    text: {
        overdue: (count: number) => string;
        due: (count: number) => string;
        upcoming: (count: number) => string;
        oneDue: string;
        oneUpcoming: string;
        manyUpcoming: (count: number) => string;
    },
) {
    const { overdue, due, upcoming } = counts;
    if (overdue + due + upcoming === 0) return "";
    if (overdue === 0 && upcoming === 0 && due === 1) return text.oneDue;
    if (overdue === 0 && due === 0) return upcoming === 1 ? text.oneUpcoming : text.manyUpcoming(upcoming);
    return [overdue ? text.overdue(overdue) : "", due ? text.due(due) : "", upcoming ? text.upcoming(upcoming) : ""].filter(Boolean).join(" · ");
}

export function followUpText(template: string, values: { owner: string; pet: string; clinic: string; ask: string }) {
    return template
        .replaceAll("{owner}", values.owner)
        .replaceAll("{pet}", values.pet)
        .replaceAll("{clinic}", values.clinic)
        .replaceAll("{ask}", values.ask);
}

export function followUpChatLink(phone: string, message: string) {
    const base = ownerChat(phone);
    if (!base) return null;
    return `${base}?text=${encodeURIComponent(message)}`;
}

export function followUpDueOn(date: string) {
    return dateOnlyUtc(date);
}

export function applyFollowUp(status: FollowUpStatus, action: "complete" | "cancel" | "reschedule", date?: string) {
    if (status !== "PENDING") return null;
    if (action === "complete") return { status: "COMPLETED" as const };
    if (action === "cancel") return { status: "CANCELLED" as const };
    const dueOn = date ? followUpDueOn(date) : null;
    if (!dueOn) return null;
    return { status: "PENDING" as const, dueOn };
}
