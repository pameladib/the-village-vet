"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAppointmentOutcome } from "@/lib/actions/visits";
import type { AppointmentType } from "../../../generated/prisma/client";
import type { Copy } from "@/lib/i18n";

export default function AppointmentOutcomes({
    id,
    type,
    passed,
    canWrite,
    copy,
}: {
    id: string;
    type: AppointmentType;
    passed: boolean;
    canWrite: boolean;
    copy: Copy;
}) {
    const router = useRouter();
    const [ask, setAsk] = useState<"missed" | "done" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const clinical = type !== "GROOMING";

    async function apply(outcome: "COMPLETED" | "EXPIRED") {
        setPending(true);
        setError(null);
        const result = await setAppointmentOutcome(id, outcome);
        setPending(false);
        if (!result.success) {
            setError(copy.outcomeError);
            return;
        }
        setAsk(null);
        router.refresh();
    }

    return (
        <div className="flex flex-col items-start gap-2">
            <div className="flex flex-wrap gap-2">
                {clinical && canWrite && (
                    <Link href={`/admin/appointments/${id}/complete`} className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950">
                        {copy.completeVisit}
                    </Link>
                )}
                {!clinical && (
                    <button type="button" onClick={() => setAsk("done")} className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950">
                        {copy.markDone}
                    </button>
                )}
                {passed && (
                    <button type="button" onClick={() => setAsk("missed")} className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800">
                        {copy.didNotAttend}
                    </button>
                )}
            </div>
            {ask && (
                <div className="max-w-sm rounded-2xl bg-stone-50 px-3 py-3 dark:bg-stone-950">
                    <p className="text-sm text-stone-700 dark:text-stone-200">{ask === "missed" ? copy.confirmMissed : copy.confirmGrooming}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" disabled={pending} onClick={() => apply(ask === "missed" ? "EXPIRED" : "COMPLETED")} className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                            {ask === "missed" ? copy.didNotAttend : copy.markDone}
                        </button>
                        <button type="button" onClick={() => setAsk(null)} className="rounded-full px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                            {copy.confirmCancelAction}
                        </button>
                    </div>
                </div>
            )}
            {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        </div>
    );
}
