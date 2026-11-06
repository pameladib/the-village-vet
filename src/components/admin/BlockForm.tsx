"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBlock, deleteBlock } from "@/lib/actions/schedule";

export default function BlockForm({ today }: { today: string }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    return (
        <form
            className="mt-4 grid gap-2 sm:grid-cols-2"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const [startHour, startMinute] = String(form.get("start") ?? "0:0").split(":").map(Number);
                const [endHour, endMinute] = String(form.get("end") ?? "0:0").split(":").map(Number);
                const result = await createBlock({
                    date: String(form.get("date") ?? ""),
                    startHour,
                    startMinute,
                    endHour,
                    endMinute,
                    scope: String(form.get("scope") ?? ""),
                });
                if (!result.success) {
                    setError(result.formErrors[0] ?? "Could not save the block.");
                    return;
                }
                setError(null);
                router.refresh();
            }}
        >
            <input type="date" name="date" min={today} required className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
            <select name="scope" className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950">
                <option value="CLINIC">Vet only</option>
                <option value="GROOMING">Grooming only</option>
                <option value="BOTH">Vet and grooming</option>
            </select>
            <input type="time" name="start" required className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
            <input type="time" name="end" required className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
            {error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}
            <button type="submit" className="w-fit rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white">Add block</button>
        </form>
    );
}

export function DeleteBlockButton({ id }: { id: string }) {
    const router = useRouter();
    return (
        <button
            type="button"
            onClick={async () => {
                await deleteBlock(id);
                router.refresh();
            }}
            className="text-xs font-medium text-red-700"
        >
            Remove
        </button>
    );
}
