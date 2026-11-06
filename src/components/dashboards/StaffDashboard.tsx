import Link from "next/link";
import DueOverrideForm from "@/components/admin/DueOverrideForm";
import NotificationList from "@/components/NotificationList";
import type { Copy } from "@/lib/i18n";

type Visit = {
    id: string;
    type: string;
    startAt: Date;
    petName: string;
    ownerName: string;
    phone: string;
};

type Match = {
    id: string;
    name: string;
    phoneNumber: string;
    pets: { id: string; name: string }[];
};

type Reminder = {
    id: string;
    kind: string;
    dueAt: Date;
    petName: string;
    ownerName: string;
};

const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

export default function StaffDashboard({
    copy,
    clinical,
    query,
    today,
    upcoming,
    matches,
    reminders,
    pendingOrders,
    lowStock,
    notices,
}: {
    copy: Copy;
    clinical: boolean;
    query: string;
    today: Visit[];
    upcoming: Visit[];
    matches: Match[];
    reminders: Reminder[];
    pendingOrders: number;
    lowStock: { id: string; name: string; stock: number }[];
    notices: { id: string; title: string; body: string; readAt: Date | null }[];
}) {
    const now = Date.now();

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 bg-emerald-50 px-4 py-8 dark:bg-stone-950">
            <h1 className="text-2xl font-semibold text-emerald-950 dark:text-emerald-50">{copy.dashboard}</h1>
            <nav className="flex flex-wrap gap-3 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                <Link href="/appointments/new">{copy.bookForClient}</Link>
                {clinical && <Link href="/admin/blocks">{copy.blocks}</Link>}
                <Link href="/admin/shop">{copy.shop}</Link>
                <Link href="/admin/orders">{copy.orders} ({pendingOrders})</Link>
                {clinical && <Link href="/admin/settings">{copy.settings}</Link>}
                <Link href="/admin/invites">{copy.invites}</Link>
            </nav>

            <section className="rounded-2xl bg-white p-4 dark:bg-stone-900">
                <h2 className="text-sm font-medium">{copy.notices}</h2>
                <NotificationList items={notices} empty={copy.noNotices} markRead={copy.markRead} />
            </section>

            <section className="rounded-2xl bg-white p-4 dark:bg-stone-900">
                <h2 className="text-sm font-medium">{copy.today}</h2>
                <VisitList visits={today} empty="No visits today." />
            </section>

            <section className="rounded-2xl bg-white p-4 dark:bg-stone-900">
                <h2 className="text-sm font-medium">{copy.upcomingVisits}</h2>
                <VisitList visits={upcoming} empty={copy.noVisits} />
            </section>

            <section className="rounded-2xl bg-white p-4 dark:bg-stone-900">
                <h2 className="text-sm font-medium">{copy.search}</h2>
                <form className="mt-3 flex gap-2" action="/dashboard">
                    <input name="q" defaultValue={query} placeholder={copy.searchHint} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
                    <button className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white">{copy.search}</button>
                </form>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                    {matches.map((owner) => (
                        <li key={owner.id} className="rounded-xl border border-stone-200 px-3 py-2 dark:border-stone-700">
                            <p className="font-medium">{owner.name}</p>
                            <p className="text-stone-500">{owner.phoneNumber}</p>
                            <ul className="mt-1">
                                {owner.pets.map((pet) => (
                                    <li key={pet.id}>
                                        {clinical ? <Link href={`/pets/${pet.id}`} className="text-emerald-800 underline">{pet.name}</Link> : pet.name}
                                        {" · "}
                                        <Link href={`/appointments/new?petId=${pet.id}`} className="text-emerald-800 underline">{copy.book}</Link>
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                    {query && matches.length === 0 && <li>{copy.noMatches}</li>}
                </ul>
            </section>

            {clinical && (
                <section className="rounded-2xl bg-white p-4 dark:bg-stone-900">
                    <h2 className="text-sm font-medium">{copy.care}</h2>
                    <ul className="mt-3 flex flex-col gap-2 text-sm">
                        {reminders.map((reminder) => (
                            <li key={reminder.id}>
                                <p>{reminder.petName} · {reminder.ownerName} · {reminder.kind}</p>
                                <p className={reminder.dueAt.getTime() < now ? "text-red-700" : "text-stone-500"}>
                                    {reminder.dueAt.getTime() < now ? copy.overdue : copy.due} {time.format(reminder.dueAt)}
                                </p>
                                <DueOverrideForm reminderId={reminder.id} />
                            </li>
                        ))}
                        {reminders.length === 0 && <li>{copy.noCare}</li>}
                    </ul>
                </section>
            )}

            <section className="rounded-2xl bg-white p-4 dark:bg-stone-900">
                <h2 className="text-sm font-medium">{copy.stock}</h2>
                <ul className="mt-2 text-sm">
                    {lowStock.map((product) => <li key={product.id}>{product.name}: {product.stock}</li>)}
                    {lowStock.length === 0 && <li>No products are at two or fewer.</li>}
                </ul>
            </section>
        </div>
    );
}

function VisitList({ visits, empty }: { visits: Visit[]; empty: string }) {
    if (visits.length === 0) return <p className="mt-2 text-sm text-stone-500">{empty}</p>;
    return (
        <ul className="mt-2 flex flex-col gap-2 text-sm">
            {visits.map((visit) => (
                <li key={visit.id} className="rounded-xl border border-stone-200 px-3 py-2 dark:border-stone-700">
                    <p className="font-medium">{visit.petName} · {visit.type}</p>
                    <p>{visit.ownerName} · {visit.phone}</p>
                    <p className="text-stone-500">{time.format(visit.startAt)}</p>
                    <Link href={`/appointments/${visit.id}/reschedule`} className="text-emerald-800 underline">Reschedule</Link>
                </li>
            ))}
        </ul>
    );
}
