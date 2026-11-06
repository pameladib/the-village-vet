"use client";

import { useState } from "react";
import { createOwnerInvite } from "@/lib/actions/invite";

export default function InviteForm() {
    const [path, setPath] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    return (
        <form
            className="mt-4 flex max-w-md flex-col gap-2"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const result = await createOwnerInvite({
                    name: String(form.get("name") ?? ""),
                    phoneNumber: String(form.get("phoneNumber") ?? ""),
                });
                if (!result.success) {
                    setError(result.formErrors[0] ?? "Could not create the link.");
                    setPath(null);
                    return;
                }
                setError(null);
                setPath(result.path);
            }}
        >
            <input name="name" required placeholder="Owner name" className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
            <input name="phoneNumber" required placeholder="Phone number" className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
            <button type="submit" className="w-fit rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white">Create link</button>
            {error && <p className="text-sm text-red-700">{error}</p>}
            {path && (
                <p className="break-all rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50">
                    Give this link to the owner. It works once, for seven days: {path}
                </p>
            )}
        </form>
    );
}
