import Link from "next/link";
import { appointmentDetail, appointmentTypes, formatVisitServices, groomingServices } from "@/lib/appointments/labels";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { pageKey } from "@/lib/slug";
import type { PetProfileData, ProfileAppointment, ProfileVisit } from "../PetProfile";

function startTime(value: Date | string) {
    const date = value instanceof Date ? value : new Date(value);
    return date.getTime();
}

function formatWhen(value: Date | string, locale: Locale, withTime: boolean) {
    return new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        weekday: "short",
        month: "short",
        day: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    }).format(new Date(startTime(value)));
}

function preview(notes: string | null) {
    const text = notes?.trim();
    if (!text) return "";
    return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

function AppointmentCard({ appointment, copy, locale }: { appointment: ProfileAppointment; copy: Copy; locale: Locale }) {
    return (
        <div className="rounded-2xl bg-stone-100 px-3.5 py-3.5 dark:bg-stone-900">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                {appointmentTypes(copy)[appointment.type]}
            </p>
            {appointment.type === "VETERINARY_VISIT" && appointment.services.length > 0 && (
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{formatVisitServices(appointment.services, copy)}</p>
            )}
            {appointment.type === "GROOMING" && appointment.groomingService && (
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{groomingServices(copy)[appointment.groomingService]}</p>
            )}
            <p className="mt-1 text-sm text-stone-900 dark:text-stone-50">
                {formatWhen(appointment.startAt, locale, true)} · {appointment.duration} {copy.minutesShort}
            </p>
            <p className="mt-1 text-sm text-stone-500">{copy.booked}</p>
        </div>
    );
}

export default function AppointmentsTab({
    pet,
    visits,
    canRecord = false,
    copy,
    locale,
}: {
    pet: PetProfileData;
    visits: ProfileVisit[];
    canRecord?: boolean;
    copy: Copy;
    locale: Locale;
}) {
    const now = Date.now();
    const upcoming = pet.appointments
        .filter((appointment) => appointment.status === "BOOKED" && startTime(appointment.startAt) >= now)
        .sort((left, right) => startTime(left.startAt) - startTime(right.startAt));

    return (
        <div className="flex flex-col gap-6">
            <section>
                <h3 className="mb-2 text-sm font-medium text-emerald-900 dark:text-emerald-200">{copy.visitUpcoming}</h3>
                {upcoming.length === 0 ? (
                    <p className="rounded-2xl bg-stone-100 px-3.5 py-3.5 text-sm text-stone-400 dark:bg-stone-900 dark:text-stone-500">{copy.noUpcomingAppts}</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {upcoming.map((appointment) => (
                            <AppointmentCard key={appointment.id} appointment={appointment} copy={copy} locale={locale} />
                        ))}
                    </div>
                )}
            </section>
            <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{copy.visitHistory}</h3>
                    {canRecord && (
                        <Link href={`/pets/${pageKey(pet)}/visits/new`} className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950">
                            {copy.addVisit}
                        </Link>
                    )}
                </div>
                {visits.length === 0 ? (
                    <p className="rounded-2xl bg-stone-100 px-3.5 py-3.5 text-sm text-stone-400 dark:bg-stone-900 dark:text-stone-500">{copy.noVisitHistory}</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {visits.map((visit) => (
                            <Link key={visit.id} href={`/pets/${pageKey(pet)}/visits/${visit.id}`} className="rounded-2xl bg-stone-100 px-3.5 py-3.5 hover:bg-emerald-50 dark:bg-stone-900 dark:hover:bg-emerald-950/40">
                                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{appointmentDetail(visit.type, visit.services, null, copy)}</p>
                                <p className="mt-1 text-sm text-stone-900 dark:text-stone-50">{formatWhen(visit.visitedAt, locale, visit.linked)}</p>
                                <p className="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-300">{preview(visit.notes) || copy.noVisitNotes}</p>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
