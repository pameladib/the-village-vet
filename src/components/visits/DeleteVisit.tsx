"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteVisit } from "@/lib/actions/visits";
import type { Copy } from "@/lib/i18n";

export default function DeleteVisit({ visitId, petId, copy }: { visitId: string; petId: string; copy: Copy }) {
    const router = useRouter();
    const [ask, setAsk] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function remove() {
        setPending(true);
        setError(null);
        const result = await deleteVisit(visitId);
        setPending(false);
        if (!result.success) {
            setError(result.error === "blocked" ? copy.visitDeleteBlocked : copy.visitSaveError);
            return;
        }
        router.push(`/pets/${petId}`);
        router.refresh();
    }

    return (
        <div className="mt-6">
            {!ask ? (
                <button type="button" onClick={() => setAsk(true)} className="text-sm font-medium text-red-700 hover:underline dark:text-red-300">
                    {copy.visitDelete}
                </button>
            ) : (
                <div className="rounded-2xl bg-stone-50 px-4 py-3 dark:bg-stone-950">
                    <p className="text-sm text-stone-700 dark:text-stone-200">{copy.visitDeleteAsk}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={pending} onClick={remove} className="rounded-full bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60">
                            {copy.visitDeleteYes}
                        </button>
                        <button type="button" onClick={() => setAsk(false)} className="rounded-full px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                            {copy.confirmCancelAction}
                        </button>
                    </div>
                </div>
            )}
            {error && <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
        </div>
    );
}
