"use client";

import { Bell, CalendarDays, HeartPulse, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { presentNotice } from "@/lib/notifications/present";

type NoticeItem = {
    id: string;
    title: string;
    body: string;
    readAt: Date | null;
    createdAt?: Date | string | null;
    dedupeKey?: string | null;
    href?: string | null;
};

function noticeKind(item: NoticeItem) {
    const key = item.dedupeKey ?? "";
    if (key.startsWith("order:") || item.title.startsWith("Order") || item.title === "New shop order") return "order" as const;
    if (key.startsWith("care:") || item.title.startsWith("Care")) return "care" as const;
    if (key.startsWith("booked:") || key.startsWith("cancelled:") || key.startsWith("rescheduled:") || key.startsWith("appt-") || item.title.startsWith("Appointment")) return "appointment" as const;
    return "general" as const;
}

const icons = {
    order: ShoppingBag,
    care: HeartPulse,
    appointment: CalendarDays,
    general: Bell,
};

export default function NotificationList({
    items,
    empty,
    markRead,
    markAllRead,
    locale = "en",
    copy,
    heading,
    headingAs = "p",
    headingClassName,
    extra,
}: {
    items: NoticeItem[];
    empty: string;
    markRead: string;
    markAllRead: string;
    locale?: Locale;
    copy?: Copy;
    heading?: string;
    headingAs?: "h2" | "p";
    headingClassName?: string;
    extra?: ReactNode;
}) {
    const router = useRouter();
    const [dismissed, setDismissed] = useState<string[]>([]);
    const [pendingAll, setPendingAll] = useState(false);
    const visible = items.filter((item) => !item.readAt && !dismissed.includes(item.id));
    const when = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Beirut" });
    const Heading = headingAs;

    async function openNotice(item: NoticeItem) {
        if (!item.href) return;
        setDismissed((current) => [...current, item.id]);
        const result = await markNotificationRead(item.id);
        if (!result.success) {
            setDismissed((current) => current.filter((id) => id !== item.id));
            return;
        }
        router.push(item.href);
    }

    async function markAll() {
        if (pendingAll || visible.length === 0) return;
        const ids = visible.map((item) => item.id);
        setPendingAll(true);
        setDismissed((current) => [...current, ...ids]);
        const result = await markAllNotificationsRead();
        if (!result.success) {
            setDismissed((current) => current.filter((id) => !ids.includes(id)));
            setPendingAll(false);
            return;
        }
        router.refresh();
        setPendingAll(false);
    }

    const header = heading ? (
        <div className="flex items-center justify-between gap-3">
            <Heading className={headingClassName}>{heading}</Heading>
            {visible.length > 0 && (
                <button
                    type="button"
                    onClick={markAll}
                    disabled={pendingAll}
                    className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium text-emerald-800 transition duration-200 hover:bg-emerald-100 hover:text-emerald-950 disabled:opacity-60 dark:text-emerald-200 dark:hover:bg-emerald-900 dark:hover:text-emerald-50"
                >
                    {markAllRead}
                </button>
            )}
        </div>
    ) : null;

    if (visible.length === 0) {
        return (
            <>
                {header}
                {extra}
                <p className="mt-3 text-sm text-stone-500">{empty}</p>
            </>
        );
    }

    return (
        <>
            {header}
            {extra}
            <ul className="mt-3 flex flex-col gap-2">
            {visible.map((item) => {
                const Icon = icons[noticeKind(item)];
                const text = copy ? presentNotice(item, copy, locale) : item;
                const created = item.createdAt ? new Date(item.createdAt) : null;
                return (
                    <li key={item.id} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm dark:border-stone-700 dark:bg-stone-950">
                        <div className="flex gap-3">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                <Icon className="size-4" strokeWidth={1.75} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <button
                                    type="button"
                                    onClick={() => openNotice(item)}
                                    className={`w-full text-start ${item.href ? "cursor-pointer" : "cursor-default"}`}
                                >
                                    <span className="flex items-start gap-2">
                                        <span className="font-medium text-stone-900 dark:text-stone-50">{text.title}</span>
                                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-700" />
                                    </span>
                                    <span className="mt-0.5 block text-stone-600 dark:text-stone-300">{text.body}</span>
                                    {created && !Number.isNaN(created.getTime()) && <span className="mt-1 block text-xs text-stone-400">{when.format(created)}</span>}
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setDismissed((current) => [...current, item.id]);
                                        const result = await markNotificationRead(item.id);
                                        if (!result.success) {
                                            setDismissed((current) => current.filter((id) => id !== item.id));
                                            return;
                                        }
                                        router.refresh();
                                    }}
                                    className="mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium text-emerald-800 transition duration-200 hover:bg-emerald-100 hover:text-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900 dark:hover:text-emerald-50"
                                >
                                    {markRead}
                                </button>
                            </div>
                        </div>
                    </li>
                );
            })}
            </ul>
        </>
    );
}
