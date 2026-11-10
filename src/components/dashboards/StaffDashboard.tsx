import Link from "next/link";
import {
    Bell,
    CalendarDays,
    CalendarOff,
    CalendarPlus,
    Clock,
    HeartPulse,
    LayoutDashboard,
    Package,
    PawPrint,
    Settings,
    ShoppingBag,
    UserPlus,
} from "lucide-react";
import NotificationList from "@/components/NotificationList";
import { appointmentDetail, visitServiceLabels } from "@/lib/appointments/labels";
import type { Copy, Locale } from "@/lib/i18n";
import type { AppointmentType, GroomingService, VisitService } from "../../../generated/prisma/client";

type Visit = {
    id: string;
    petId: string;
    type: AppointmentType;
    services: VisitService[];
    groomingService: GroomingService | null;
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

type NavItem = {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    current?: boolean;
};

const cardClass = "rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900";

export default function StaffDashboard({
    copy,
    locale,
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
    locale: Locale;
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
    const todayIds = new Set(today.map((visit) => visit.id));
    const later = upcoming.filter((visit) => !todayIds.has(visit.id));
    const overdue = reminders.filter((reminder) => reminder.dueAt.getTime() < now);
    const upcomingCare = reminders.filter((reminder) => reminder.dueAt.getTime() >= now);
    const dateLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
        timeZone: "Asia/Beirut",
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date());

    const primary: NavItem[] = [
        { href: "/dashboard", label: copy.dashboard, icon: LayoutDashboard, current: true },
        { href: "/dashboard#schedule", label: copy.appointments, icon: CalendarDays },
        { href: "/dashboard#patients", label: copy.patients, icon: PawPrint },
        ...(clinical ? [{ href: "/dashboard#care", label: copy.careManagement, icon: HeartPulse }] : []),
        { href: "/admin/orders", label: copy.shopAndOrders, icon: ShoppingBag },
        { href: "/dashboard#notices", label: copy.notices, icon: Bell },
        ...(clinical ? [{ href: "/admin/settings", label: copy.settings, icon: Settings }] : []),
    ];
    const utility: NavItem[] = [
        { href: "/admin/shop", label: copy.products, icon: Package },
        ...(clinical ? [{ href: "/admin/blocks", label: copy.blocks, icon: CalendarOff }] : []),
        { href: "/admin/invites", label: copy.invites, icon: UserPlus },
    ];

    const summaries = [
        { href: "/dashboard#schedule", label: copy.todayAppointments, value: today.length, icon: CalendarDays },
        { href: "/dashboard#upcoming", label: copy.upcomingVisits, value: later.length, icon: Clock },
        clinical
            ? { href: "/dashboard#care", label: copy.overdueCare, value: overdue.length, icon: HeartPulse }
            : { href: "/admin/shop", label: copy.stock, value: lowStock.length, icon: Package },
        { href: "/admin/orders", label: copy.pendingOrders, value: pendingOrders, icon: ShoppingBag },
    ];

    return (
        <div className="flex w-full flex-1 flex-col bg-stone-100 lg:flex-row dark:bg-stone-950">
            <aside className="flex flex-col border-b border-stone-200 bg-white lg:sticky lg:top-0 lg:h-[calc(100dvh-4rem)] lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-e lg:border-b-0 dark:border-stone-800 dark:bg-stone-900">
                <div className="px-4 py-4">
                    <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-emerald-800 uppercase dark:text-emerald-300">{copy.clinicName}</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.dashboard}</p>
                </div>
                <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:overflow-visible">
                    {primary.map((item) => <SideLink key={item.href} item={item} />)}
                </nav>
                <nav className="flex gap-1 overflow-x-auto border-t border-stone-100 px-3 py-2 lg:mt-auto lg:flex-col lg:overflow-visible dark:border-stone-800">
                    {utility.map((item) => <SideLink key={item.href} item={item} muted />)}
                </nav>
            </aside>

            <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.dashboard}</h1>
                        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{dateLabel}</p>
                    </div>
                    <Link
                        href="/appointments/new"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                    >
                        <CalendarPlus className="size-4" />
                        {copy.newAppointment}
                    </Link>
                </header>

                <section className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {summaries.map((item) => (
                        <Link key={item.label} href={item.href} className={`${cardClass} px-4 py-3 hover:border-emerald-700/30`}>
                            <span className="flex items-center justify-between gap-2 text-xs font-medium text-stone-500 dark:text-stone-400">
                                {item.label}
                                <item.icon className="size-4 shrink-0 text-emerald-800 dark:text-emerald-300" />
                            </span>
                            <span className="mt-2 block text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{item.value}</span>
                        </Link>
                    ))}
                </section>

                <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
                    <div className="flex flex-col gap-5">
                        <section id="schedule" className={`${cardClass} scroll-mt-4`}>
                            <SectionHeading title={copy.today} count={today.length} />
                            <VisitList visits={today} empty={copy.noVisitsToday} clinical={clinical} copy={copy} locale={locale} />
                        </section>
                        <section id="upcoming" className={`${cardClass} scroll-mt-4`}>
                            <SectionHeading title={copy.upcomingVisits} count={later.length} />
                            <VisitList visits={later} empty={copy.noVisits} clinical={clinical} copy={copy} locale={locale} showDate />
                        </section>
                    </div>

                    <div className="flex flex-col gap-5">
                        {clinical && (
                            <div id="care" className="scroll-mt-4 flex flex-col gap-5">
                                <CareList title={copy.overdueCareSection} reminders={overdue} empty={copy.noCare} copy={copy} locale={locale} overdue />
                                <CareList title={copy.upcomingCare} reminders={upcomingCare} empty={copy.noCare} copy={copy} locale={locale} />
                            </div>
                        )}
                        <section className={cardClass}>
                            <SectionHeading title={copy.stock} count={lowStock.length} action={{ href: "/admin/shop", label: copy.manageStock }} />
                            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                                {lowStock.map((product) => (
                                    <li key={product.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                                        <span className="min-w-0 truncate text-stone-800 dark:text-stone-100">{product.name}</span>
                                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">{product.stock}</span>
                                    </li>
                                ))}
                                {lowStock.length === 0 && <li className="px-4 py-3 text-sm text-stone-500">{copy.noLowStock}</li>}
                            </ul>
                        </section>
                    </div>
                </div>

                <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
                    <section id="notices" className={`${cardClass} scroll-mt-4 px-4 py-3`}>
                        <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.notices}</h2>
                        <NotificationList items={notices} empty={copy.noNotices} markRead={copy.markRead} />
                    </section>

                    <section id="patients" className={`${cardClass} scroll-mt-4 px-4 py-3`}>
                        <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.search}</h2>
                        <form className="mt-3 flex gap-2" action="/dashboard">
                            <input
                                name="q"
                                defaultValue={query}
                                placeholder={copy.searchHint}
                                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                            />
                            <button className="rounded-lg bg-emerald-900 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-950 dark:bg-emerald-700">{copy.search}</button>
                        </form>
                        <ul className="mt-3 flex flex-col gap-2 text-sm">
                            {matches.map((owner) => (
                                <li key={owner.id} className="rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-700">
                                    <p className="font-medium text-stone-900 dark:text-stone-50">{owner.name}</p>
                                    <p className="text-stone-500">{owner.phoneNumber}</p>
                                    <ul className="mt-1">
                                        {owner.pets.map((pet) => (
                                            <li key={pet.id}>
                                                {clinical ? <Link href={`/pets/${pet.id}`} className="font-medium text-emerald-900 underline-offset-2 hover:underline dark:text-emerald-200">{pet.name}</Link> : pet.name}
                                                {" · "}
                                                <Link href={`/appointments/new?petId=${pet.id}`} className="font-medium text-emerald-900 underline-offset-2 hover:underline dark:text-emerald-200">{copy.book}</Link>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                            {query && matches.length === 0 && <li className="text-stone-500">{copy.noMatches}</li>}
                        </ul>
                    </section>
                </div>
            </main>
        </div>
    );
}

function SideLink({ item, muted }: { item: NavItem; muted?: boolean }) {
    const Icon = item.icon;
    const current = item.current;
    return (
        <Link
            href={item.href}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                current
                    ? "bg-emerald-950 text-white dark:bg-emerald-800"
                    : muted
                        ? "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                        : "text-stone-800 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-800"
            }`}
        >
            <Icon className="size-4 shrink-0" />
            {item.label}
        </Link>
    );
}

function SectionHeading({ title, count, action }: { title: string; count?: number; action?: { href: string; label: string } }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 dark:border-stone-800">
            <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{title}</h2>
            <span className="flex items-center gap-3">
                {action && <Link href={action.href} className="text-xs font-medium text-emerald-900 hover:underline dark:text-emerald-200">{action.label}</Link>}
                {count != null && <span className="text-xs text-stone-500">{count}</span>}
            </span>
        </div>
    );
}

function VisitList({
    visits,
    empty,
    clinical,
    copy,
    locale,
    showDate,
}: {
    visits: Visit[];
    empty: string;
    clinical: boolean;
    copy: Copy;
    locale: Locale;
    showDate?: boolean;
}) {
    if (visits.length === 0) return <p className="px-4 py-3 text-sm text-stone-500">{empty}</p>;
    const clock = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
        timeZone: "Asia/Beirut",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    const day = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
        timeZone: "Asia/Beirut",
        weekday: "short",
        day: "numeric",
        month: "short",
    });

    return (
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {visits.map((visit) => (
                <li key={visit.id} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center">
                    <div>
                        <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{clock.format(visit.startAt)}</p>
                        {showDate && <p className="text-xs text-stone-500">{day.format(visit.startAt)}</p>}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                            {clinical ? <Link href={`/pets/${visit.petId}`} className="hover:underline">{visit.petName}</Link> : visit.petName}
                        </p>
                        <p className="truncate text-xs text-stone-500">
                            {visit.ownerName}
                            {" · "}
                            <a href={`tel:${visit.phone}`} className="hover:underline">{visit.phone}</a>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-stone-600 dark:text-stone-300">{appointmentDetail(visit.type, visit.services, visit.groomingService)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{copy.booked}</span>
                        <Link href={`/appointments/${visit.id}/reschedule`} className="text-xs font-medium text-emerald-900 hover:underline dark:text-emerald-200">{copy.reschedule}</Link>
                    </div>
                </li>
            ))}
        </ul>
    );
}

function CareList({
    title,
    reminders,
    empty,
    copy,
    locale,
    overdue,
}: {
    title: string;
    reminders: Reminder[];
    empty: string;
    copy: Copy;
    locale: Locale;
    overdue?: boolean;
}) {
    const when = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
        timeZone: "Asia/Beirut",
        day: "numeric",
        month: "short",
    });

    return (
        <section className={cardClass}>
            <SectionHeading title={title} count={reminders.length} />
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {reminders.map((reminder) => (
                    <li key={reminder.id} className="px-4 py-2.5 text-sm">
                        <p className="font-medium text-stone-900 dark:text-stone-50">{reminder.petName}</p>
                        <p className="text-xs text-stone-500">{reminder.ownerName} · {careKind(reminder.kind)}</p>
                        <p className={`mt-0.5 text-xs ${overdue ? "font-medium text-red-700 dark:text-red-300" : "text-stone-500"}`}>
                            {overdue ? copy.overdue : copy.due} {when.format(reminder.dueAt)}
                        </p>
                    </li>
                ))}
                {reminders.length === 0 && <li className="px-4 py-3 text-sm text-stone-500">{empty}</li>}
            </ul>
        </section>
    );
}

function careKind(kind: string) {
    if (kind in visitServiceLabels) return visitServiceLabels[kind as VisitService];
    return kind;
}
