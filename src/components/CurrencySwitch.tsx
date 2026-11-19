"use client";

import { useRouter } from "next/navigation";
import { setCurrency } from "@/lib/actions/currency";
import type { Currency } from "@/lib/shop/money";

const options: Currency[] = ["USD", "LBP"];

export default function CurrencySwitch({ currency, label }: { currency: Currency; label: string }) {
    const router = useRouter();

    return (
        <div className="inline-flex items-center rounded-full border border-stone-200 p-0.5 dark:border-stone-700" role="group" aria-label={label}>
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    aria-pressed={currency === option}
                    onClick={() => {
                        if (currency === option) return;
                        void setCurrency(option).then(() => router.refresh());
                    }}
                    className={currency === option
                        ? "rounded-full bg-emerald-900 px-2 py-1 text-xs font-medium text-white"
                        : "rounded-full px-2 py-1 text-xs text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"}
                >
                    {option}
                </button>
            ))}
        </div>
    );
}
