import Link from "next/link";
import { appointmentDetail } from "@/lib/appointments/labels";
import type { StaffVisit } from "@/app/(app)/dashboard/load-staff";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";

export default function VisitTable({
    visits,
    copy,
    locale,
    clinical,
    showDate = false,
}: {
    visits: StaffVisit[];
    copy: Copy;
    locale: Locale;
    clinical: boolean;
    showDate?: boolean;
}) {
    const clock = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    const day = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        weekday: "short",
        day: "numeric",
        month: "short",
    });

    return (
        <div className="mt-3 overflow-hidden rounded-2xl bg-white dark:bg-stone-900">
            <div className="hidden grid-cols-[5.5rem_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] gap-3 border-b border-stone-100 px-4 py-2 text-xs font-medium text-stone-500 sm:grid dark:border-stone-800">
                <span>{copy.columnTime}</span>
                <span>{copy.columnPet}</span>
                <span>{copy.columnOwner}</span>
                <span>{copy.columnService}</span>
                <span className="sr-only">{copy.viewAppointment}</span>
            </div>
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {visits.map((visit) => (
                    <li key={visit.id} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[5.5rem_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:items-center sm:gap-3">
                        <div>
                            <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{clock.format(visit.startAt)}</p>
                            {showDate && <p className="text-xs text-stone-500">{day.format(visit.startAt)}</p>}
                        </div>
                        <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                            {clinical ? <Link href={`/pets/${visit.petId}`} className="hover:underline">{visit.petName}</Link> : visit.petName}
                        </p>
                        <p className="truncate text-sm text-stone-600 dark:text-stone-300">
                            {visit.ownerName}
                            {" · "}
                            <a href={`tel:${visit.phone}`} className="hover:underline">{visit.phone}</a>
                        </p>
                        <p className="truncate text-sm text-stone-600 dark:text-stone-300">{appointmentDetail(visit.type, visit.services, visit.groomingService)}</p>
                        <Link href={`/admin/appointments/${visit.id}`} className="text-sm font-medium text-emerald-900 hover:underline sm:text-end dark:text-emerald-200">
                            {copy.viewAppointment}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
