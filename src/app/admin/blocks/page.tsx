import Link from "next/link";
import { redirect } from "next/navigation";
import BlockForm, { DeleteBlockButton } from "@/components/admin/BlockForm";
import { todayInBeirut } from "@/lib/appointments/availability";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

export default async function BlocksPage() {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const blocks = await prisma.scheduleBlock.findMany({
        where: { endAt: { gt: new Date() } },
        orderBy: { startAt: "asc" },
    });

    return (
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
            <Link href="/dashboard" className="text-sm text-emerald-800">Back</Link>
            <h1 className="mt-3 text-2xl font-semibold">Schedule blocks</h1>
            <p className="mt-1 text-sm text-stone-600">Vet only leaves grooming open. Grooming only leaves the vet open. Both closes the clinic.</p>
            <BlockForm today={todayInBeirut()} />
            <ul className="mt-6 flex flex-col gap-2 text-sm">
                {blocks.map((block) => (
                    <li key={block.id} className="flex items-center justify-between rounded-xl border border-stone-200 px-3 py-2">
                        <span>{block.scope} · {time.format(block.startAt)} – {time.format(block.endAt)}</span>
                        <DeleteBlockButton id={block.id} />
                    </li>
                ))}
            </ul>
        </main>
    );
}
