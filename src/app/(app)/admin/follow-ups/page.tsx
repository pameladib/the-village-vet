import { redirect } from "next/navigation";
import FollowUpList, { type FollowUpItem } from "@/components/admin/FollowUpList";
import { careTiming } from "@/lib/appointments/availability";
import { requireRole } from "@/lib/auth/session";
import { formatDateOnly } from "@/lib/clinic/vaccines";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const locale = await getLocale();
    const copy = messages(locale);
    const requested = (await searchParams).tab;
    const tabName = Array.isArray(requested) ? requested[0] : requested;
    const tab = tabName === "today" || tabName === "upcoming" ? tabName : "overdue";
    const reminders = await prisma.visitFollowUp.findMany({
        where: { status: "PENDING" },
        orderBy: { dueOn: "asc" },
        select: {
            id: true,
            dueOn: true,
            notes: true,
            pet: { select: { id: true, name: true, sex: true, owner: { select: { name: true, phoneNumber: true } } } },
        },
    });
    const rows: FollowUpItem[] = reminders.map((row) => ({
        id: row.id,
        dueOn: formatDateOnly(row.dueOn),
        notes: row.notes,
        timing: careTiming(row.dueOn),
        petId: row.pet.id,
        petName: row.pet.name,
        ownerName: row.pet.owner.name,
        phone: row.pet.owner.phoneNumber,
        sex: row.pet.sex,
    }));

    return (
        <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.followUpReminders}</h1>
            <p className="mt-1 text-sm text-stone-500">{copy.followUpLead}</p>
            <FollowUpList copy={copy} locale={locale} rows={rows} tab={tab} />
        </main>
    );
}
