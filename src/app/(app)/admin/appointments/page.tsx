import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { redirect } from "next/navigation";
import AppointmentTabs, { type AppointmentTab } from "@/components/admin/AppointmentTabs";
import FocusHighlight from "@/components/FocusHighlight";
import UpcomingFilter from "@/components/admin/UpcomingFilter";
import VisitTable from "@/components/dashboards/VisitTable";
import AppointmentOutcomes from "@/components/visits/AppointmentOutcomes";
import { findStaffVisit, loadAppointmentsBetween, loadCancelledAppointments, loadStaffAppointments } from "@/app/(app)/dashboard/load-staff";
import { requireRole } from "@/lib/auth/session";
import { canSeeClinicalRecords } from "@/lib/auth/permissions";
import { clinicDayRange, todayInBeirut } from "@/lib/appointments/availability";
import { spanBounds, tomorrowInBeirut, upcomingSpan, type UpcomingWhen } from "@/lib/appointments/upcoming-filter";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

function one(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

const focusPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function StaffAppointmentsPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; when?: string | string[]; on?: string | string[]; focus?: string | string[] }> }) {
    let session;
    try {
        session = await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const locale = await getLocale();
    const copy = messages(locale);
    const clinical = canSeeClinicalRecords(session.user.role);
    const params = await searchParams;
    const tabName = one(params.tab);
    const focusName = one(params.focus) ?? "";
    const focusId = focusPattern.test(focusName) ? focusName : "";
    if (focusId && tabName !== "today" && tabName !== "awaiting" && tabName !== "upcoming" && tabName !== "cancelled") {
        const target = await prisma.appointment.findUnique({ where: { id: focusId }, select: { status: true, startAt: true } });
        const range = clinicDayRange(todayInBeirut());
        let next: AppointmentTab = "today";
        if (target?.status === "CANCELLED") next = "cancelled";
        else if (target && range && target.startAt >= range.open && target.startAt < range.close) next = "today";
        else if (target && target.startAt.getTime() >= Date.now()) next = "upcoming";
        else if (target?.status === "BOOKED") next = "awaiting";
        redirect(`/admin/appointments?tab=${next}&focus=${focusId}`);
    }
    const tab: AppointmentTab = tabName === "awaiting" || tabName === "upcoming" || tabName === "cancelled" ? tabName : "today";
    const whenName = one(params.when);
    const upcomingWhen: UpcomingWhen = whenName === "tomorrow" || whenName === "week" || whenName === "date" ? whenName : "all";
    const chosenDate = one(params.on) ?? "";
    const [{ today, upcoming, awaiting }, cancelled] = await Promise.all([loadStaffAppointments(), loadCancelledAppointments()]);
    const todayIds = new Set(today.map((visit) => visit.id));
    const later = upcoming.filter((visit) => !todayIds.has(visit.id));
    if (focusId && tab === "upcoming" && !later.some((visit) => visit.id === focusId)) {
        const extra = await findStaffVisit(focusId);
        if (extra && extra.startAt.getTime() >= Date.now()) later.push(extra);
    }
    const span = upcomingSpan(upcomingWhen, chosenDate);
    const bounds = typeof span === "object" ? spanBounds(span) : null;
    const shown = span === "all" ? later : bounds ? await loadAppointmentsBetween(bounds.start, bounds.end) : [];

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.appointments}</h1>
                <Link href="/admin/appointments/new" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-950">
                    <CalendarPlus className="size-4" />
                    {copy.newAppointment}
                </Link>
            </div>

            {focusId && <FocusHighlight id={`visit-${focusId}`} active clearHref={tab === "today" ? "/admin/appointments" : `/admin/appointments?tab=${tab}`} />}
            <AppointmentTabs
                tab={tab}
                label={copy.appointments}
                labels={{ today: copy.apptTabToday, awaiting: copy.awaitingRecord, upcoming: copy.apptUpcoming, cancelled: copy.apptTabCancelled }}
                counts={{ today: today.length, awaiting: awaiting.length, upcoming: later.length, cancelled: cancelled.length }}
                panels={{
                    today: today.length === 0 ? <p className="text-sm text-stone-500">{copy.noVisitsToday}</p> : <VisitTable visits={today} copy={copy} locale={locale} clinical={clinical} highlightId={focusId} />,
                    awaiting: (
                        <>
                            <p className="text-sm text-stone-500">{copy.awaitingLead}</p>
                            {awaiting.length === 0 ? (
                                <p className="mt-3 text-sm text-stone-500">{copy.awaitingEmpty}</p>
                            ) : (
                                <VisitTable
                                    visits={awaiting}
                                    copy={copy}
                                    locale={locale}
                                    clinical={clinical}
                                    showDate
                                    highlightId={focusId}
                                    trailingLabel={copy.columnActions}
                                    trailing={(visit) => (
                                        <AppointmentOutcomes id={visit.id} type={visit.type} passed canWrite={clinical} copy={copy} />
                                    )}
                                />
                            )}
                        </>
                    ),
                    upcoming: (
                        <div className="min-w-0">
                            <UpcomingFilter
                                when={upcomingWhen}
                                date={span === "choose" ? "" : chosenDate}
                                tomorrow={tomorrowInBeirut()}
                                label={copy.apptFilterLabel}
                                all={copy.apptFilterAll}
                                tomorrowLabel={copy.apptFilterTomorrow}
                                week={copy.apptFilterWeek}
                                specific={copy.apptFilterDate}
                            />
                            {span === "choose" ? (
                                <p className="mt-3 text-sm text-stone-500">{copy.apptFilterChoose}</p>
                            ) : shown.length === 0 ? (
                                <p className="mt-3 text-sm text-stone-500">{upcomingWhen === "all" ? copy.noVisits : copy.apptFilterEmpty}</p>
                            ) : (
                                <VisitTable visits={shown} copy={copy} locale={locale} clinical={clinical} showDate highlightId={focusId} />
                            )}
                        </div>
                    ),
                    cancelled: cancelled.length === 0
                        ? <p className="text-sm text-stone-500">{copy.apptCancelledEmpty}</p>
                        : <VisitTable visits={cancelled} copy={copy} locale={locale} clinical={clinical} showDate highlightId={focusId} cancelled />,
                }}
            />
        </main>
    );
}
