import type { Appointment, AppointmentType, BlockScope, ScheduleBlock, Species } from "../../../generated/prisma/client";

const TIME_ZONE = "Asia/Beirut"; // must ensure appointment times correspond to the clinic’s local timezone, regardless of the server’s timezone (which may be in another timezone)

function clinicDate(date: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date); // regular expression to match the date format YYYY-MM-DD; exec() is a function that attemps to find a match between the regular expression and the date string
    if (!match) throw new Error("Clinic date must be YYYY-MM-DD"); // if no match, match will be null, so we throw an error

    /* 
    exec() is a JS method that is used for matching regular expressions against strings
    It searches the string for the specific regex pattern
    If it finds a match, it returns an array containing the matched groups: first element of the array (match[0]) is the full matched string, the remaining elements are the matched substrings that we separated by () in the regex pattern (match[1], match[2], etc.)
    Otherwise, it returns null*/

    const year = Number(match[1]); // match[1] is the first matched substring (the year); Number() converts the string to a number
    const month = Number(match[2]); // match[2] is the second matched substring (the month)
    const day = Number(match[3]); // match[3] is the third matched substring (the day)

    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
        throw new Error("Clinic date must be a real calendar day");
    }

    return { year, month, day, weekday: check.getUTCDay() };
}

function beirutParts(instant: Date) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TIME_ZONE,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(instant);

    const value: Record<string, number> = {};
    for (const part of parts) {
        if (part.type !== "literal") value[part.type] = Number(part.value);
    }
    value.hour %= 24;
    return value;
}

function beirutOffset(instant: Date) {
    const value = beirutParts(instant);
    const wallTime = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second);
    return wallTime - instant.getTime();
}

function isBeforeToday(year: number, month: number, day: number, now: Date) {
    const today = beirutParts(now);
    return year * 10000 + month * 100 + day < today.year * 10000 + today.month * 100 + today.day;
}

// Minutes are Beirut clock time. Lebanon is UTC+2 in winter and UTC+3 in summer.
function atBeirut(year: number, month: number, day: number, minutes: number) {
    const guess = new Date(Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60));
    const offset = beirutOffset(guess);
    const instant = new Date(guess.getTime() - offset);
    const corrected = beirutOffset(instant);
    return corrected === offset ? instant : new Date(guess.getTime() - corrected);
}

// Check-up, vaccination, treatment, and follow-up are 30 minutes. Grooming is always 2 hours.
export function appointmentDuration(type: AppointmentType, species: Species) {
    if (type === "GROOMING") return 120;
    if (type === "OPERATION") return species === "CAT" ? 60 : 120;
    return 30;
}

export function todayInBeirut(now = new Date()) {
    const today = beirutParts(now);
    const month = String(today.month).padStart(2, "0");
    const day = String(today.day).padStart(2, "0");
    return `${today.year}-${month}-${day}`;
}

// Open and close instants for one clinic day. Sunday has no range.
export function clinicDayRange(date: string) {
    const { year, month, day, weekday } = clinicDate(date);
    if (weekday === 0) return null;
    const close = weekday === 6 ? 14 * 60 : 18 * 60;
    return {
        open: atBeirut(year, month, day, 9 * 60),
        close: atBeirut(year, month, day, close),
    };
}

export function beirutInstant(date: string, hour: number, minute: number) {
    const { year, month, day } = clinicDate(date);
    return atBeirut(year, month, day, hour * 60 + minute);
}

function blockApplies(scope: BlockScope, type: AppointmentType) {
    if (scope === "BOTH") return true;
    if (scope === "GROOMING") return type === "GROOMING";
    return type !== "GROOMING";
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
    return startA < endB && startB < endA;
}

function addMinutes(instant: Date, minutes: number) {
    return new Date(instant.getTime() + minutes * 60_000);
}

export function getAvailableStarts(
    appointmentType: AppointmentType,
    species: Species,
    date: string,
    bookedAppointments: Appointment[],
    blockedPeriods: ScheduleBlock[],
): Date[] {
    const now = new Date();
    const { year, month, day, weekday } = clinicDate(date);
    if (weekday === 0 || isBeforeToday(year, month, day, now)) return [];

    const open = 9 * 60;
    const close = weekday === 6 ? 14 * 60 : 18 * 60;
    const duration = appointmentDuration(appointmentType, species);

    const startMinutes: number[] = [];
    if (appointmentType === "OPERATION") {
        startMinutes.push(9 * 60);
        if (species === "CAT") startMinutes.push(10 * 60);
    } else {
        for (let minute = open; minute + duration <= close; minute += 30) {
            startMinutes.push(minute);
        }
    }

    const conflicts = [
        ...bookedAppointments
            .filter((appointment) => (appointmentType === "GROOMING") === (appointment.type === "GROOMING"))
            .map((appointment) => ({
                start: appointment.startAt,
                end: addMinutes(appointment.startAt, appointment.duration),
            })),
        ...blockedPeriods
            .filter((block) => blockApplies(block.scope, appointmentType))
            .map((block) => ({ start: block.startAt, end: block.endAt })),
    ];

    return startMinutes
        .map((minutes) => atBeirut(year, month, day, minutes))
        .filter((start) => {
            if (start <= now) return false;
            const end = addMinutes(start, duration);
            return conflicts.every((conflict) => !overlaps(start, end, conflict.start, conflict.end));
        });
}
