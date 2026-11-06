"use client";

import { useState } from "react";
import { setTreatmentDue } from "@/lib/actions/care";

export default function TreatmentDueForm({ petId, treatmentId }: { petId: string; treatmentId: string }) {
    const [message, setMessage] = useState<string | null>(null);

    return (
        <form
            className="mt-2 flex flex-wrap items-center gap-2"
            onSubmit={async (event) => {
                event.preventDefault();
                const dueAt = String(new FormData(event.currentTarget).get("dueAt") ?? "");
                const result = await setTreatmentDue({ petId, treatmentId, dueAt });
                setMessage(result.success ? "Due date saved." : result.formErrors[0] ?? "Could not save the date.");
            }}
        >
            <label className="text-xs text-stone-600 dark:text-stone-300">
                Next due
                <input type="date" name="dueAt" required className="ms-2 rounded-lg border border-stone-300 px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-950" />
            </label>
            <button type="submit" className="rounded-lg bg-emerald-800 px-2.5 py-1 text-xs font-medium text-white">Save</button>
            {message && <span className="text-xs text-stone-600 dark:text-stone-300">{message}</span>}
        </form>
    );
}
