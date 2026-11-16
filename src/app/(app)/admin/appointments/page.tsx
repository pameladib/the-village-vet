import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { redirect } from "next/navigation";
import VisitTable from "@/components/dashboards/VisitTable";
import { loadStaffAppointments } from "@/app/(app)/dashboard/load-staff";
import { requireRole } from "@/lib/auth/session";
import { canSeeClinicalRecords } from "@/lib/auth/permissions";
import { getLocale, messages } from "@/lib/i18n";

export default async function StaffAppointmentsPage() {
    let session;
    try {
        session = await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const locale = await getLocale();
    const copy = messages(locale);
    const clinical = canSeeClinicalRecords(session.user.role);
    const { today, upcoming } = await loadStaffAppointments();
    const todayIds = new Set(today.map((visit) => visit.id));
    const later = upcoming.filter((visit) => !todayIds.has(visit.id));

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.appointments}</h1>
                <Link href="/appointments/new" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-950">
                    <CalendarPlus className="size-4" />
                    {copy.newAppointment}
                </Link>
            </div>

            <section className="mt-8">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.todaySchedule}</h2>
                {today.length === 0 ? <p className="mt-3 text-sm text-stone-500">{copy.noVisitsToday}</p> : <VisitTable visits={today} copy={copy} locale={locale} clinical={clinical} />}
            </section>

            <section className="mt-8">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.upcomingVisits}</h2>
                {later.length === 0 ? <p className="mt-3 text-sm text-stone-500">{copy.noVisits}</p> : <VisitTable visits={later} copy={copy} locale={locale} clinical={clinical} showDate />}
            </section>
        </main>
    );
}
