import { redirect } from "next/navigation";
import BlockForm from "@/components/admin/BlockForm";
import { todayInBeirut } from "@/lib/appointments/availability";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function BlocksPage() {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const locale = await getLocale();
    const copy = messages(locale);
    const blocks = await prisma.scheduleBlock.findMany({
        where: { endAt: { gt: new Date() } },
        orderBy: { startAt: "asc" },
        select: { id: true, startAt: true, endAt: true, scope: true },
    });

    return (
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.blocksTitle}</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{copy.blocksLead}</p>
            <BlockForm
                today={todayInBeirut()}
                copy={copy}
                locale={locale}
                blocks={blocks.map((block) => ({
                    id: block.id,
                    startAt: block.startAt.toISOString(),
                    endAt: block.endAt.toISOString(),
                    scope: block.scope,
                }))}
            />
        </main>
    );
}
