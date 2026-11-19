"use client";

import { useRouter } from "next/navigation";
import type { UpcomingWhen } from "@/lib/appointments/upcoming-filter";

const control = "max-w-full rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

export default function UpcomingFilter({
    when,
    date,
    tomorrow,
    label,
    all,
    tomorrowLabel,
    week,
    specific,
}: {
    when: UpcomingWhen;
    date: string;
    tomorrow: string;
    label: string;
    all: string;
    tomorrowLabel: string;
    week: string;
    specific: string;
}) {
    const router = useRouter();

    function apply(next: UpcomingWhen, nextDate = "") {
        const params = new URLSearchParams({ tab: "upcoming" });
        if (next !== "all") params.set("when", next);
        if (next === "date" && nextDate) params.set("on", nextDate);
        router.replace(`/admin/appointments?${params.toString()}`, { scroll: false });
    }

    return (
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <label className="sr-only" htmlFor="upcoming-filter">{label}</label>
            <select id="upcoming-filter" value={when} onChange={(event) => apply(event.target.value as UpcomingWhen)} className={`${control} w-full sm:w-auto`}>
                <option value="all">{all}</option>
                <option value="tomorrow">{tomorrowLabel}</option>
                <option value="week">{week}</option>
                <option value="date">{specific}</option>
            </select>
            {when === "date" && (
                <input
                    type="date"
                    aria-label={specific}
                    min={tomorrow}
                    value={date}
                    onChange={(event) => apply("date", event.target.value)}
                    dir="ltr"
                    className={`${control} w-full text-left sm:w-auto`}
                />
            )}
        </div>
    );
}
