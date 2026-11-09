/* 
This file contains functions to handle appointment availability and timing.
Its job is to determine which appointments are available for booking at a given date. It takes into consideration the following:
- The clinic's opening hours
- The duration of each appointment type
- The booked appointments for that date
- The blocked periods for that date

The functions can be grouped into 4 categories:
1. Date and timezone handling: these functions ensure that appointment times are interpreted according to the clinic’s local timezone (Beirut), rather than the server’s timezone.  
  - clinicDate() validates a date string in the format YYYY-MM-DD, extracts the year, month, and day number, and checks if it is a real calendar day
  - beirutParts() converts a Date object to a record of its year, month, day, hour, minute, and second components, in Beirut time
  - beirutOffset() calculates the difference between a Date object and the same instant in Beirut time
  - isBeforeToday() checks if a given date is before today
  - atBeirut() converts a time in minutes to a Date object in Beirut time
  - hourInBeirut() returns the current hour in Beirut time
  - todayInBeirut() returns the current date in Beirut time
  - clinicDayRange() returns the open and close instants for one clinic day
  - beirutInstant() converts a date string and hour and minute to a Date object in Beirut time

2. Appointment rules: these functions determine the duration of each appointment type and the availability of each appointment type.
  - appointmentDuration() returns the duration of an appointment type in minutes
  - hourInBeirut() returns the current hour in Beirut time
  - todayInBeirut() returns the current date in Beirut time
  - clinicDayRange() returns the open and close instants for one clinic day
  - beirutInstant() converts a date string and hour and minute to a Date object in Beirut time

3. Availability calculations
4. Conflict detection
*/



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

function beirutParts(instant: Date) { // a JavaScript Date object represents an instant in time, not a specific timezone. beirutParts take that instant and and extracts its date and time components in Beirut time. It returns an object with the year, month, day, hour, minute, and second.
    const parts = new Intl.DateTimeFormat("en-US", { // 
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

// A veterinary visit is 30 minutes however many services it includes. Grooming is 2 hours. An operation is 1 hour for a cat and 2 hours for a dog.
export function appointmentDuration(type: AppointmentType, species: Species) {
    if (type === "GROOMING") return 120;
    if (type === "OPERATION") return species === "CAT" ? 60 : 120;
    return 30;
}

// hourInBeirut returns the current hour in Beirut time
export function hourInBeirut(now = new Date()) { // now is a default parameter. If we call the function without an argument, now defaults to the current date and time
    return beirutParts(now).hour; // beirutParts returns an object with the year, month, day, hour, minute, and second. We only need the hour, so we access it with .hour.
}

export function calendarDateInBeirut(instant: Date) {
    const parts = beirutParts(instant);
    const month = String(parts.month).padStart(2, "0");
    const day = String(parts.day).padStart(2, "0");
    return `${parts.year}-${month}-${day}`;
}

export function todayInBeirut(now = new Date()) {
    return calendarDateInBeirut(now);
}

function addCalendarDays(date: string, days: number) {
    const [year, month, day] = date.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + days));
    return next.toISOString().slice(0, 10);
}

// "due" on the due date and "plus7" seven calendar days later. Any other day, including the days after a missed notice, returns null.
export function careNoticeDay(dueAt: Date, now: Date) {
    const today = todayInBeirut(now);
    const dueDay = calendarDateInBeirut(dueAt);
    if (dueDay === today) return "due" as const;
    if (dueDay === addCalendarDays(today, -7)) return "plus7" as const;
    return null;
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
