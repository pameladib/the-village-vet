"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import NotificationList from "@/components/NotificationList";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";

export default function NotificationBell({
    copy,
    locale,
    items,
}: {
    copy: Copy;
    locale: Locale;
    items: { id: string; title: string; body: string; readAt: Date | null; createdAt?: Date | null; dedupeKey?: string | null }[];
}) {
    const [open, setOpen] = useState(false);
    const panel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function close(event: MouseEvent) {
            if (!panel.current?.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    return (
        <div ref={panel} className="relative">
            <button
                type="button"
                aria-label={copy.notices}
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
                className="relative rounded-full p-1.5 text-emerald-900 hover:bg-emerald-50 dark:text-emerald-100 dark:hover:bg-emerald-950"
            >
                <Bell className="size-5" strokeWidth={1.75} />
                {items.length > 0 && (
                    <span className="absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-emerald-900 px-1 text-[0.65rem] font-medium text-white">
                        {new Intl.NumberFormat(intlLocale(locale)).format(items.length)}
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute end-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-stone-200 bg-white p-3 shadow-lg dark:border-stone-700 dark:bg-stone-900">
                    <p className="text-sm font-medium text-emerald-950 dark:text-emerald-50">{copy.notices}</p>
                    <NotificationList items={items} empty={copy.noNotices} markRead={copy.markRead} locale={locale} copy={copy} />
                </div>
            )}
        </div>
    );
}
