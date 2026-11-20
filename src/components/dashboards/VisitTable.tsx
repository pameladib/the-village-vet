import Link from "next/link";
import type { ReactNode } from "react";
import { appointmentDetail } from "@/lib/appointments/labels";
import type { StaffVisit } from "@/app/(app)/dashboard/load-staff";
import { focusClass } from "@/components/focus-class";
import { ownerChat } from "@/lib/clinic/public";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";

export default function VisitTable({
    visits,
    copy,
    locale,
    clinical,
    showDate = false,
    highlightId = null,
    cancelled = false,
    trailingLabel,
    trailing,
}: {
    visits: StaffVisit[];
    copy: Copy;
    locale: Locale;
    clinical: boolean;
    showDate?: boolean;
    highlightId?: string | null;
    cancelled?: boolean;
    trailingLabel?: string;
    trailing?: (visit: StaffVisit) => ReactNode;
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
    const cancelledAt = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });

    const last = trailingLabel ?? (cancelled ? copy.columnCancelled : copy.viewAppointment);

    return (
        <div className="mt-3 overflow-hidden rounded-2xl bg-white px-4 dark:bg-stone-900 sm:grid sm:grid-cols-[5.5rem_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto]">
            <div className="hidden border-b border-stone-100 text-center text-xs font-medium text-stone-500 sm:col-span-5 sm:grid sm:grid-cols-subgrid sm:items-center dark:border-stone-800">
                <span className="px-2 py-2 text-center">{copy.columnTime}</span>
                <span className="px-2 py-2 text-center">{copy.columnPet}</span>
                <span className="px-2 py-2 text-center">{copy.columnOwner}</span>
                <span className="px-2 py-2 text-center">{copy.columnService}</span>
                <span className="px-2 py-2 text-center">{last}</span>
            </div>
            <ul className="contents">
                {visits.map((visit) => {
                    const chat = ownerChat(visit.phone);
                    const marked = visit.id === highlightId;
                    return (
                        <li key={visit.id} data-focus={`visit-${visit.id}`} className={`grid grid-cols-1 gap-1 border-b border-stone-100 py-3 last:border-b-0 sm:col-span-5 sm:grid sm:grid-cols-subgrid sm:items-center sm:gap-0 sm:text-center dark:border-stone-800 ${focusClass(marked)}`}>
                            <div className="sm:px-2 sm:text-center">
                                <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{clock.format(visit.startAt)}</p>
                                {showDate && <p className="text-xs text-stone-500">{day.format(visit.startAt)}</p>}
                            </div>
                            <p className="truncate text-sm font-medium text-stone-900 sm:min-w-0 sm:px-2 sm:text-center dark:text-stone-50">
                                {clinical ? <Link href={`/pets/${visit.petSlug}`} className="hover:underline">{visit.petName}</Link> : visit.petName}
                            </p>
                            <p className="truncate text-sm text-stone-600 sm:min-w-0 sm:px-2 sm:text-center dark:text-stone-300">
                                <Link href={`/admin/owners/${visit.ownerId}`} className="hover:underline">{visit.ownerName}</Link>
                                {" · "}
                                {chat ? (
                                    <a href={chat} target="_blank" rel="noopener noreferrer" aria-label={copy.whatsappOwner.replace("{phone}", visit.phone)} className="hover:underline">{visit.phone}</a>
                                ) : visit.phone}
                            </p>
                            <p className="truncate text-sm text-stone-600 sm:min-w-0 sm:px-2 sm:text-center dark:text-stone-300">{appointmentDetail(visit.type, visit.services, visit.groomingService, copy)}</p>
                            {trailing ? (
                                <div className="flex sm:justify-center sm:px-2">{trailing(visit)}</div>
                            ) : cancelled ? (
                                <p className="text-sm text-stone-500 sm:px-2 sm:text-center">{visit.cancelledAt ? cancelledAt.format(visit.cancelledAt) : ""}</p>
                            ) : (
                                <Link href={`/admin/appointments/${visit.id}`} className="text-sm font-medium text-emerald-900 hover:underline sm:px-2 sm:text-center dark:text-emerald-200">
                                    {copy.viewAppointment}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
