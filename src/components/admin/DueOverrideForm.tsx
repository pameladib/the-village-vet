"use client";

import { useState } from "react";
import { overrideCareDue } from "@/lib/actions/care";

export default function DueOverrideForm({ reminderId }: { reminderId: string }) {
    const [message, setMessage] = useState<string | null>(null);

    return (
        <form
            className="mt-1 flex flex-wrap items-center gap-2"
            onSubmit={async (event) => {
                event.preventDefault();
                const dueAt = String(new FormData(event.currentTarget).get("dueAt") ?? "");
                const result = await overrideCareDue({ reminderId, dueAt });
                setMessage(result.success ? "Updated." : result.formErrors[0] ?? "Could not update.");
            }}
        >
            <input type="date" name="dueAt" required className="rounded-lg border border-stone-300 px-2 py-1 text-xs dark:border-stone-700 dark:bg-stone-950" />
            <button type="submit" className="text-xs font-medium text-emerald-800 dark:text-emerald-200">Change due date</button>
            {message && <span className="text-xs">{message}</span>}
        </form>
    );
}
