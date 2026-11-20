"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type AppointmentTab = "today" | "awaiting" | "upcoming" | "cancelled";

const tabs: AppointmentTab[] = ["today", "awaiting", "upcoming", "cancelled"];

export default function AppointmentTabs({
    tab,
    label,
    labels,
    counts,
    panels,
}: {
    tab: AppointmentTab;
    label: string;
    labels: Record<AppointmentTab, string>;
    counts: Record<AppointmentTab, number>;
    panels: Record<AppointmentTab, ReactNode>;
}) {
    const router = useRouter();
    const [selected, setSelected] = useState(tab);

    useEffect(() => {
        setSelected(tab);
    }, [tab]);

    useEffect(() => {
        const hash = window.location.hash.replace("#", "");
        if (hash === "awaiting" || hash === "upcoming" || hash === "cancelled") {
            router.replace(`/admin/appointments?tab=${hash}`, { scroll: false });
        }
    }, [router]);

    function choose(next: AppointmentTab) {
        setSelected(next);
        router.replace(next === "today" ? "/admin/appointments" : `/admin/appointments?tab=${next}`, { scroll: false });
    }

    return (
        <div className="mt-6">
            <div className="flex justify-start">
                <div role="tablist" aria-label={label} className="flex w-max min-w-0 max-w-full gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {tabs.map((id) => {
                        const active = selected === id;
                        const waiting = id === "awaiting" && counts[id] > 0 && !active;
                        return (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                id={`appointments-${id}`}
                                aria-selected={active}
                                aria-controls={`appointments-${id}-panel`}
                                onClick={() => choose(id)}
                                className={
                                    active
                                        ? "inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                                        : "inline-flex shrink-0 items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-900 shadow-sm transition duration-200 hover:border-emerald-700 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50 dark:hover:border-emerald-400 dark:hover:bg-emerald-950/40"
                                }
                            >
                                {labels[id]}
                                <span
                                    className={
                                        waiting
                                            ? "rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-950 dark:bg-amber-900/60 dark:text-amber-100"
                                            : active
                                              ? "rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold"
                                              : "rounded-full bg-stone-100 px-1.5 py-0.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                                    }
                                >
                                    {counts[id]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div role="tabpanel" id={`appointments-${selected}-panel`} aria-labelledby={`appointments-${selected}`} className="mt-3">
                {panels[selected]}
            </div>
        </div>
    );
}
