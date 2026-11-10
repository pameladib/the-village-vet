import type { Copy } from "@/lib/i18n";

const rows = [
    ["hoursWeekdayLabel", "hoursWeekday"],
    ["hoursSaturdayLabel", "hoursSaturday"],
    ["hoursSundayLabel", "hoursSunday"],
] as const;

export default function OpeningHours({ copy }: { copy: Copy }) {
    return (
        <dl className="flex flex-col gap-2 text-sm">
            {rows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-6">
                    <dt className="text-stone-500 dark:text-stone-400">{copy[label]}</dt>
                    <dd className="font-medium text-emerald-950 dark:text-emerald-50">{copy[value]}</dd>
                </div>
            ))}
        </dl>
    );
}
