import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { redirect } from "next/navigation";
import AppointmentTabs, { type AppointmentTab } from "@/components/admin/AppointmentTabs";
import VisitTable from "@/components/dashboards/VisitTable";
import { ownerChat } from "@/lib/clinic/public";
import AppointmentOutcomes from "@/components/visits/AppointmentOutcomes";
import { loadStaffAppointments } from "@/app/(app)/dashboard/load-staff";
import { requireRole } from "@/lib/auth/session";
import { canSeeClinicalRecords } from "@/lib/auth/permissions";
import { appointmentDetail } from "@/lib/appointments/labels";
import { getLocale, messages } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";

export default async function StaffAppointmentsPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
    let session;
    try {
        session = await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const locale = await getLocale();
    const copy = messages(locale);
    const clinical = canSeeClinicalRecords(session.user.role);
    const requested = (await searchParams).tab;
    const tabName = Array.isArray(requested) ? requested[0] : requested;
    const tab: AppointmentTab = tabName === "awaiting" || tabName === "upcoming" ? tabName : "today";
    const { today, upcoming, awaiting } = await loadStaffAppointments();
    const todayIds = new Set(today.map((visit) => visit.id));
    const later = upcoming.filter((visit) => !todayIds.has(visit.id));
    const when = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.appointments}</h1>
                <Link href="/admin/appointments/new" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-950">
                    <CalendarPlus className="size-4" />
                    {copy.newAppointment}
                </Link>
            </div>

            <AppointmentTabs
                tab={tab}
                label={copy.appointments}
                labels={{ today: copy.apptTabToday, awaiting: copy.awaitingRecord, upcoming: copy.apptUpcoming }}
                counts={{ today: today.length, awaiting: awaiting.length, upcoming: later.length }}
                panels={{
                    today: today.length === 0 ? <p className="text-sm text-stone-500">{copy.noVisitsToday}</p> : <VisitTable visits={today} copy={copy} locale={locale} clinical={clinical} />,
                    awaiting: (
                        <>
                            <p className="text-sm text-stone-500">{copy.awaitingLead}</p>
                            {awaiting.length === 0 ? (
                                <p className="mt-3 text-sm text-stone-500">{copy.awaitingEmpty}</p>
                            ) : (
                                <ul className="mt-3 flex flex-col gap-2">
                                    {awaiting.map((visit) => {
                                        const chat = ownerChat(visit.phone);
                                        return (
                                            <li key={visit.id} className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 dark:bg-stone-900 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                                                        {clinical ? <Link href={`/pets/${visit.petId}`} className="hover:underline">{visit.petName}</Link> : visit.petName}
                                                        {" · "}
                                                        <Link href={`/admin/owners/${visit.ownerId}`} className="hover:underline">{visit.ownerName}</Link>
                                                        {chat ? <>{" · "}<a href={chat} target="_blank" rel="noopener noreferrer" className="hover:underline">{visit.phone}</a></> : null}
                                                    </p>
                                                    <p className="truncate text-sm text-stone-500">{appointmentDetail(visit.type, visit.services, visit.groomingService, copy)}</p>
                                                    <p className="text-sm text-stone-500">{when.format(visit.startAt)}</p>
                                                </div>
                                                <AppointmentOutcomes id={visit.id} type={visit.type} passed canWrite={clinical} copy={copy} />
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </>
                    ),
                    upcoming: later.length === 0 ? <p className="text-sm text-stone-500">{copy.noVisits}</p> : <VisitTable visits={later} copy={copy} locale={locale} clinical={clinical} showDate />,
                }}
            />
        </main>
    );
}
