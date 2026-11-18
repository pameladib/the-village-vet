"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePricing } from "@/lib/actions/clinic";
import type { Copy } from "@/lib/i18n";
import type { Currency } from "@/lib/shop/money";

const field = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

export default function PricingForm({
    copy,
    currency,
    rate,
}: {
    copy: Copy;
    currency: Currency;
    rate: number;
}) {
    const router = useRouter();
    const [nextCurrency, setNextCurrency] = useState(currency);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    return (
        <form
            className="mt-8 flex max-w-lg flex-col gap-4 border-t border-stone-200 pt-8 dark:border-stone-800"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const result = await savePricing({
                    currency: String(form.get("currency") ?? ""),
                    rate: Number(form.get("rate")),
                });
                setError(result.success ? null : copy.pricingErrRate);
                setMessage(result.success ? (result.converted ? copy.pricingConverted : copy.profileSaved) : null);
                if (result.success) router.refresh();
            }}
        >
            <div>
                <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">{copy.pricingTitle}</h2>
                <p className="mt-1 text-sm text-stone-500">{copy.pricingLead}</p>
            </div>
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {copy.pricingPrimary}
                <select name="currency" value={nextCurrency} onChange={(event) => setNextCurrency(event.target.value as Currency)} className={field}>
                    <option value="USD">USD</option>
                    <option value="LBP">LBP</option>
                </select>
            </label>
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {copy.pricingRate}
                <input name="rate" type="number" min={1} step={1} required defaultValue={rate} className={field} />
                <span className="mt-1 block text-xs font-normal text-stone-500">{copy.pricingRateHint}</span>
            </label>
            {nextCurrency !== currency && <p className="text-sm text-amber-900 dark:text-amber-200">{copy.pricingConvertWarn}</p>}
            {message && <p className="text-sm text-emerald-800 dark:text-emerald-200">{message}</p>}
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button type="submit" className="w-fit rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950">{copy.pricingSave}</button>
        </form>
    );
}
