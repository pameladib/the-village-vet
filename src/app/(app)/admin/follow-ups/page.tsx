import Link from "next/link";
import { redirect } from "next/navigation";
import FollowUpList, { type FollowUpItem } from "@/components/admin/FollowUpList";
import { careTiming } from "@/lib/appointments/availability";
import { requireRole } from "@/lib/auth/session";
import { formatDateOnly } from "@/lib/clinic/vaccines";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

function one(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; added?: string | string[] }> }) {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const locale = await getLocale();
    const copy = messages(locale);
    const params = await searchParams;
    const tabName = one(params.tab);
    const tab = tabName === "today" || tabName === "upcoming" ? tabName : "overdue";
    const added = one(params.added);
    const highlightId = added && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(added) ? added : null;
    const reminders = await prisma.visitFollowUp.findMany({
        where: { status: "PENDING" },
        orderBy: { dueOn: "asc" },
        select: {
            id: true,
            dueOn: true,
            notes: true,
            pet: { select: { id: true, name: true, sex: true, owner: { select: { id: true, name: true, phoneNumber: true } } } },
        },
    });
    const rows: FollowUpItem[] = reminders.map((row) => ({
        id: row.id,
        dueOn: formatDateOnly(row.dueOn),
        notes: row.notes,
        timing: careTiming(row.dueOn),
        petId: row.pet.id,
        petName: row.pet.name,
        ownerId: row.pet.owner.id,
        ownerName: row.pet.owner.name,
        phone: row.pet.owner.phoneNumber,
        sex: row.pet.sex,
    }));

    return (
        <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.followUpReminders}</h1>
                    <p className="mt-1 text-sm text-stone-500">{copy.followUpLead}</p>
                </div>
                <Link href="/admin/follow-ups/new" className="shrink-0 rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950">{copy.followUpAdd}</Link>
            </div>
            <FollowUpList copy={copy} locale={locale} rows={rows} tab={tab} highlightId={highlightId} />
        </main>
    );
}
