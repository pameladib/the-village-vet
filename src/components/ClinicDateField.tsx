"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { intlLocale } from "@/lib/intl-locale";
import type { Copy, Locale } from "@/lib/i18n";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseIso(date: string) {
    const [year, month, day] = date.split("-").map(Number);
    return { year, month, day };
}

function toIso(year: number, month: number, day: number) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isSunday(year: number, month: number, day: number) {
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0;
}

export default function ClinicDateField({
    value,
    min,
    onChange,
    locale = "en",
    copy,
}: {
    value: string;
    min: string;
    onChange: (date: string) => void;
    locale?: Locale;
    copy?: Copy;
}) {
    const start = parseIso(value || min);
    const [visible, setVisible] = useState({ year: start.year, month: start.month });
    const minParts = parseIso(min);
    const atMinMonth = visible.year === minParts.year && visible.month === minParts.month;
    const firstWeekday = new Date(Date.UTC(visible.year, visible.month - 1, 1)).getUTCDay();
    const leading = (firstWeekday + 6) % 7;
    const daysInMonth = new Date(Date.UTC(visible.year, visible.month, 0)).getUTCDate();
    const monthLabel = new Intl.DateTimeFormat(intlLocale(locale), {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(Date.UTC(visible.year, visible.month - 1, 1)));
    const dayNumber = new Intl.NumberFormat(intlLocale(locale), { useGrouping: false });
    const weekdays = copy
        ? [copy.weekdayMon, copy.weekdayTue, copy.weekdayWed, copy.weekdayThu, copy.weekdayFri, copy.weekdaySat, copy.weekdaySun]
        : WEEKDAYS;

    function shiftMonth(delta: number) {
        const next = new Date(Date.UTC(visible.year, visible.month - 1 + delta, 1));
        const year = next.getUTCFullYear();
        const month = next.getUTCMonth() + 1;
        if (year < minParts.year || (year === minParts.year && month < minParts.month)) return;
        setVisible({ year, month });
    }

    return (
        <div className="mt-1 rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-stone-950">
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => shiftMonth(-1)}
                    disabled={atMinMonth}
                    aria-label={copy?.calPrev ?? "Previous month"}
                    className="rounded-lg p-1.5 text-emerald-800 hover:bg-emerald-50 disabled:opacity-30 dark:text-emerald-200 dark:hover:bg-emerald-950"
                >
                    <ChevronLeft className="size-4 rtl:rotate-180" strokeWidth={1.5} />
                </button>
                <p className="text-sm font-medium text-emerald-950 dark:text-emerald-50">{monthLabel}</p>
                <button
                    type="button"
                    onClick={() => shiftMonth(1)}
                    aria-label={copy?.calNext ?? "Next month"}
                    className="rounded-lg p-1.5 text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950"
                >
                    <ChevronRight className="size-4 rtl:rotate-180" strokeWidth={1.5} />
                </button>
            </div>
            <div className="mt-3 grid grid-cols-7 text-center text-xs font-medium text-emerald-800 dark:text-emerald-200">
                {weekdays.map((day) => (
                    <span key={day}>{day}</span>
                ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: leading }, (_, index) => (
                    <span key={`blank-${index}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, index) => {
                    const day = index + 1;
                    const iso = toIso(visible.year, visible.month, day);
                    const closed = isSunday(visible.year, visible.month, day);
                    const past = iso < min;
                    const disabled = closed || past;
                    const selected = value === iso;
                    return (
                        <button
                            key={iso}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange(iso)}
                            aria-label={closed ? `${iso}, ${copy?.calClosed ?? "clinic closed"}` : iso}
                            className={`rounded-lg py-1.5 text-sm ${
                                selected
                                    ? "bg-emerald-800 font-medium text-white"
                                    : closed
                                      ? "cursor-not-allowed text-stone-300 line-through dark:text-stone-600"
                                      : past
                                        ? "cursor-not-allowed text-stone-300 dark:text-stone-600"
                                        : "text-emerald-950 hover:bg-emerald-100 dark:text-emerald-50 dark:hover:bg-emerald-950"
                            }`}
                        >
                            {dayNumber.format(day)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
