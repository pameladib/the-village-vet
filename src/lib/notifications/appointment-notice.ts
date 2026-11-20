import type { AppointmentType, GroomingService, VisitService } from "../../../generated/prisma/client";
import { appointmentDetail } from "@/lib/appointments/labels";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";

const visitTypes = new Set<AppointmentType>(["VETERINARY_VISIT", "GROOMING", "OPERATION"]);
const groomingServices = new Set<GroomingService>(["SHOWER", "HAIRCUT", "BOTH"]);
const visitServices = new Set<VisitService>(["CHECKUP", "VACCINATION", "DEWORMING", "FLEA_TREATMENT", "FOLLOW_UP"]);

function plain(value: string) {
    return value.replaceAll("|", "/").trim();
}

export function appointmentNoticeBody(input: {
    owner: string;
    pet: string;
    type: AppointmentType;
    services: VisitService[];
    grooming: GroomingService | null;
    startAt: Date;
}) {
    const services = input.type === "VETERINARY_VISIT" ? input.services.filter((service) => visitServices.has(service)).join(",") : "";
    const grooming = input.type === "GROOMING" && input.grooming && groomingServices.has(input.grooming) ? input.grooming : "";
    return `Owner: ${plain(input.owner)} | Pet: ${plain(input.pet)} | Visit: ${input.type};${services};${grooming} | When: ${input.startAt.toISOString()}`;
}

export function presentAppointmentNotice(body: string, copy: Copy, locale: Locale) {
    const parts = body.split(" | ");
    if (parts.length !== 4) return null;
    if (!parts[0].startsWith("Owner: ") || !parts[1].startsWith("Pet: ") || !parts[2].startsWith("Visit: ") || !parts[3].startsWith("When: ")) return null;
    const when = new Date(parts[3].slice("When: ".length));
    if (Number.isNaN(when.getTime())) return null;

    const [type, services = "", grooming = ""] = parts[2].slice("Visit: ".length).split(";");
    if (!visitTypes.has(type as AppointmentType)) return null;
    const visitType = type as AppointmentType;
    const visitServicesList = visitType === "VETERINARY_VISIT"
        ? services.split(",").filter((service): service is VisitService => visitServices.has(service as VisitService))
        : [];
    const groomingService = visitType === "GROOMING" && groomingServices.has(grooming as GroomingService) ? grooming as GroomingService : null;
    const formatted = new Intl.DateTimeFormat(intlLocale(locale), {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Beirut",
    }).format(when);

    return copy.noticeApptDetail
        .replace("{owner}", parts[0].slice("Owner: ".length))
        .replace("{pet}", parts[1].slice("Pet: ".length))
        .replace("{visit}", appointmentDetail(visitType, visitServicesList, groomingService, copy))
        .replace("{when}", formatted);
}
