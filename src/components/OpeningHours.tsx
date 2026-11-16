// a small reusable component that displays the opening hours of the clinic in a table

import type { Copy } from "@/lib/i18n"; // to get the copy for the labels and values

export default function OpeningHours({ copy }: { copy: Copy }) {
    const rows = [
        ["hoursWeekdayLabel", "hoursWeekday"],
        ["hoursSaturdayLabel", "hoursSaturday"],
        ["hoursSundayLabel", "hoursSunday"],
    ] as const;

    return (
        <dl className="flex flex-col gap-2 text-sm"> {/* description list */}
            {rows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-6">
                    <dt className="text-stone-500 dark:text-stone-400">{copy[label]}</dt>
                    <dd className="font-medium text-emerald-950 dark:text-emerald-50">{copy[value]}</dd>
                </div>
            ))}
        </dl>
    );
}
