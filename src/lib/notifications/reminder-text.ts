import type { AppointmentType, GroomingService, ReminderType } from "../../../generated/prisma/client";
import type { Copy, Locale } from "@/lib/i18n";

const doseKeys = {
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
} as const satisfies Record<string, keyof Copy>;

export function reminderClock(date: Date, locale: Locale) {
    const parts = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-arab" : "en-US", {
        timeZone: "Asia/Beirut",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    }).formatToParts(date);
    const hour = parts.find((part) => part.type === "hour")?.value ?? "";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "";
    const period = parts.find((part) => part.type === "dayPeriod")?.value ?? "";
    const clock = minute === "00" || minute === "٠" || minute === "٠٠" ? hour : `${hour}:${minute}`;
    return period ? `${clock} ${period}` : clock;
}

function visitPhrase(copy: Copy, type: AppointmentType, grooming: GroomingService | null) {
    if (type === "OPERATION") return copy.noticeVisitOperation;
    if (type === "GROOMING") {
        if (grooming === "SHOWER") return copy.noticeVisitShower;
        if (grooming === "HAIRCUT") return copy.noticeVisitHaircut;
        if (grooming === "BOTH") return copy.noticeVisitBoth;
        return copy.noticeVisitGrooming;
    }
    return copy.noticeVisitVet;
}

export function visitReminder(
    copy: Copy,
    locale: Locale,
    when: "today" | "tomorrow",
    type: AppointmentType,
    grooming: GroomingService | null,
    startAt: Date,
) {
    const template = when === "today" ? copy.noticeVisitToday : copy.noticeVisitTomorrow;
    return {
        title: when === "today" ? copy.noticeApptToday : copy.noticeApptTomorrow,
        body: template.replace("{visit}", visitPhrase(copy, type, grooming)).replace("{time}", reminderClock(startAt, locale)),
    };
}

export function careReminder(copy: Copy, name: string, kind: ReminderType, dose: string | null, stillDue: boolean) {
    const doseKey = dose && dose in doseKeys ? doseKeys[dose as keyof typeof doseKeys] : "doseAnnual";
    const item = kind === "DEWORMING"
        ? copy.noticeCareDeworming
        : kind === "FLEA_TREATMENT"
            ? copy.noticeCareFlea
            : copy.noticeCareVaccine.replace("{dose}", copy[doseKey]);
    return {
        title: stillDue ? copy.noticeCareStill : copy.noticeCareDue,
        body: copy.noticeCareDueBody.replace("{name}", name).replace("{item}", item),
    };
}
