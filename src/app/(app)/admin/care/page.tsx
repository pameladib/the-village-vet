import { redirect } from "next/navigation";
import { loadCareReminders, type StaffReminder } from "@/app/(app)/dashboard/load-staff";
import { careTiming } from "@/lib/appointments/availability";
import { doseCopyKey } from "@/lib/clinic/vaccines";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import type { Copy, Locale } from "@/lib/i18n";

export default async function CarePage() {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const locale = await getLocale();
    const copy = messages(locale);
    const reminders = await loadCareReminders();
    const overdue = reminders.filter((reminder) => careTiming(reminder.dueAt) === "overdue");
    const upcoming = reminders.filter((reminder) => careTiming(reminder.dueAt) !== "overdue");

    return (
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.careManagement}</h1>
            <CareGroup title={copy.overdueCareSection} reminders={overdue} empty={copy.noCare} copy={copy} locale={locale} overdue />
            <CareGroup title={copy.upcomingCare} reminders={upcoming} empty={copy.noCare} copy={copy} locale={locale} />
        </main>
    );
}

function CareGroup({
    title,
    reminders,
    empty,
    copy,
    locale,
    overdue,
}: {
    title: string;
    reminders: StaffReminder[];
    empty: string;
    copy: Copy;
    locale: Locale;
    overdue?: boolean;
}) {
    const when = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Beirut", day: "numeric", month: "short" });
    return (
        <section className="mt-8">
            <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{title}</h2>
            {reminders.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">{empty}</p>
            ) : (
                <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
                    {reminders.map((reminder) => (
                        <li key={reminder.id} className="px-4 py-3 text-sm">
                            <p className="font-medium text-stone-900 dark:text-stone-50">{reminder.petName}</p>
                            <p className="text-stone-500">{reminder.ownerName} · {copy[doseCopyKey(reminder.dose) ?? (reminder.kind === "DEWORMING" ? "doseDeworming" : reminder.kind === "FLEA_TREATMENT" ? "doseFlea" : "doseAnnual")]}</p>
                            <p className={overdue ? "mt-0.5 text-xs font-medium text-red-700 dark:text-red-300" : "mt-0.5 text-xs text-stone-500"}>
                                {overdue ? copy.overdue : copy.due} {when.format(reminder.dueAt)}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
