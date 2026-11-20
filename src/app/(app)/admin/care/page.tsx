import { redirect } from "next/navigation";
import CareBoard, { type CareRow, type CareTab } from "@/components/admin/CareBoard";
import { loadCareReminders } from "@/app/(app)/dashboard/load-staff";
import { careTiming } from "@/lib/appointments/availability";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";

export default async function CarePage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const locale = await getLocale();
    const copy = messages(locale);
    const requested = (await searchParams).tab;
    const tabName = Array.isArray(requested) ? requested[0] : requested;
    const tab: CareTab = tabName === "today" || tabName === "upcoming" ? tabName : "overdue";
    const reminders = await loadCareReminders();
    const rows: CareRow[] = reminders.map((reminder) => ({
        id: reminder.id,
        kind: reminder.kind,
        dose: reminder.dose,
        dueAt: reminder.dueAt.toISOString(),
        timing: careTiming(reminder.dueAt),
        petId: reminder.petId,
        petSlug: reminder.petSlug,
        petName: reminder.petName,
        ownerId: reminder.ownerId,
        ownerName: reminder.ownerName,
        phone: reminder.phone,
        species: reminder.species,
        annualsBefore: reminder.annualsBefore,
    }));

    return (
        <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.careManagement}</h1>
            <p className="mt-1 text-sm text-stone-500">{copy.careLead}</p>
            <CareBoard tab={tab} rows={rows} copy={copy} locale={locale} />
        </main>
    );
}
