"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markPetDeceased } from "@/lib/actions/pet-status";
import type { Copy } from "@/lib/i18n";

export default function MarkDeceased({ petId, today, copy }: { petId: string; today: string; copy: Copy }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function save() {
        setPending(true);
        setError(null);
        const result = await markPetDeceased(petId, date);
        setPending(false);
        if (!result.success) {
            setError(result.error === "date" ? copy.deceasedDateError : copy.deceasedFailed);
            return;
        }
        setOpen(false);
        router.refresh();
    }

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-3 inline-flex rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-emerald-700 hover:text-emerald-800 dark:border-stone-600 dark:text-stone-200 dark:hover:border-emerald-400"
            >
                {copy.markDeceased}
            </button>
        );
    }

    return (
        <div className="mt-3 flex flex-col gap-2">
            <label className="text-sm text-stone-500">
                {copy.deceasedDate}
                <input
                    type="date"
                    max={today}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="mt-1 block rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                />
            </label>
            <p className="text-sm text-stone-500">{copy.deceasedDateHint}</p>
            {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="button" disabled={pending} onClick={() => void save()} className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                    {copy.deceasedSave}
                </button>
                <button type="button" disabled={pending} onClick={() => { setOpen(false); setError(null); }} className="rounded-full px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800">
                    {copy.deceasedCancel}
                </button>
            </div>
        </div>
    );
}
