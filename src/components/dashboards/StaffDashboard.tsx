import Link from "next/link";
import { CalendarDays, CalendarPlus, HeartPulse, Package, ShoppingBag } from "lucide-react";
import EnablePush from "@/components/EnablePush";
import InstallPrompt from "@/components/InstallPrompt";
import StaffShell from "@/components/dashboards/StaffShell";
import Page from "@/components/Page";
import VisitTable from "@/components/dashboards/VisitTable";
import type { StaffVisit } from "@/app/(app)/dashboard/load-staff";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";

export default function StaffDashboard({
    copy,
    locale,
    clinical,
    manageClinic,
    today,
    pendingOrders,
    lowStock,
    overdueCare,
    upcomingCare,
}: {
    copy: Copy;
    locale: Locale;
    clinical: boolean;
    manageClinic: boolean;
    today: StaffVisit[];
    pendingOrders: number;
    lowStock: number;
    overdueCare: number;
    upcomingCare: number;
}) {
    const count = new Intl.NumberFormat(intlLocale(locale));
    const dateLabel = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(new Date());
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", hour: "numeric", hourCycle: "h23" }).format(new Date()));
    const greeting = hour < 12 ? copy.goodMorning : hour < 17 ? copy.goodAfternoon : copy.goodEvening;

    const summaries = [
        { href: "#schedule", label: copy.todayAppointments, value: today.length, icon: CalendarDays },
        { href: "/admin/orders?status=pending", label: copy.pendingOrders, value: pendingOrders, icon: ShoppingBag },
        ...(clinical ? [{ href: "/admin/care", label: copy.upcomingCare, value: upcomingCare, icon: HeartPulse }] : []),
        { href: "/admin/inventory", label: copy.lowStockProducts, value: lowStock, icon: Package },
    ];
    const alerts = [
        pendingOrders > 0 ? { href: "/admin/orders?status=pending", label: copy.attentionOrders, value: pendingOrders } : null,
        lowStock > 0 ? { href: "/admin/inventory", label: copy.attentionStock, value: lowStock } : null,
        clinical && overdueCare > 0 ? { href: "/admin/care", label: copy.overdueCareSection, value: overdueCare } : null,
    ].filter((alert): alert is { href: string; label: string; value: number } => alert !== null);

    return (
        <StaffShell copy={copy} clinical={clinical} manageClinic={manageClinic}>
            <Page width="wide">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{greeting}</h1>
                        <p className="mt-1 text-sm text-stone-500">{dateLabel}</p>
                        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{copy.dashboardTodayLead}</p>
                    </div>
                    <Link
                        href="/appointments/new"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-950"
                    >
                        <CalendarPlus className="size-4" />
                        {copy.newAppointment}
                    </Link>
                </header>
                <InstallPrompt copy={copy} />
                <EnablePush copy={copy} />

                <section className={`mt-6 grid grid-cols-2 gap-3 ${summaries.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                    {summaries.map((item) => (
                        <Link key={item.label} href={item.href} className="rounded-2xl bg-white px-4 py-3 transition hover:bg-emerald-50 dark:bg-stone-900 dark:hover:bg-stone-800">
                            <span className="flex items-center justify-between gap-2 text-sm text-stone-500">
                                {item.label}
                                <item.icon className="size-4 shrink-0 text-emerald-800 dark:text-emerald-300" />
                            </span>
                            <span className="mt-2 block text-3xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{count.format(item.value)}</span>
                        </Link>
                    ))}
                </section>

                {alerts.length > 0 && (
                    <section className="mt-8">
                        <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.needsAttention}</h2>
                        <ul className="mt-3 flex flex-col gap-2">
                            {alerts.map((alert) => (
                                <li key={alert.href} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-stone-900 dark:text-stone-50">{alert.label}</p>
                                        <p className="text-sm text-stone-500">{count.format(alert.value)}</p>
                                    </div>
                                    <Link href={alert.href} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950">
                                        {copy.review}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <section id="schedule" className="mt-8 scroll-mt-6">
                    <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.todaySchedule}</h2>
                    {today.length === 0 ? (
                        <p className="mt-3 text-sm text-stone-500">{copy.noVisitsToday}</p>
                    ) : (
                        <VisitTable visits={today} copy={copy} locale={locale} clinical={clinical} />
                    )}
                </section>
            </Page>
        </StaffShell>
    );
}
