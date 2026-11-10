"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBlock, deleteBlock } from "@/lib/actions/schedule";

type BlockInput = {
    date: string;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    scope: string;
};

type BlockConflict = {
    id: string;
    petName: string;
    detail: string;
    startAt: string;
    duration: number;
};

const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Beirut",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

function formatVisit(startIso: string, duration: number) {
    const start = new Date(startIso);
    const end = new Date(start.getTime() + duration * 60_000);
    return `${time.format(start)}–${time.format(end)}`;
}

export default function BlockForm({ today }: { today: string }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState<BlockInput | null>(null);
    const [conflicts, setConflicts] = useState<BlockConflict[] | null>(null);

    useEffect(() => {
        if (!conflicts) return;
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") setConflicts(null);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [conflicts]);

    async function save(input: BlockInput, confirm = false) {
        const result = await createBlock({ ...input, confirm });
        if (!result.success) {
            if ("conflicts" in result && result.conflicts) {
                setPending(input);
                setConflicts(result.conflicts);
                return;
            }
            setError(result.formErrors[0] ?? "Could not save the block.");
            return;
        }
        setError(null);
        setPending(null);
        setConflicts(null);
        router.refresh();
    }

    return (
        <form
            className="mt-4 grid gap-2 sm:grid-cols-2"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const [startHour, startMinute] = String(form.get("start") ?? "0:0").split(":").map(Number);
                const [endHour, endMinute] = String(form.get("end") ?? "0:0").split(":").map(Number);
                await save({
                    date: String(form.get("date") ?? ""),
                    startHour,
                    startMinute,
                    endHour,
                    endMinute,
                    scope: String(form.get("scope") ?? ""),
                });
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
            <button type="submit" className="w-fit rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white transition duration-200 hover:scale-[1.02] hover:bg-emerald-900 hover:shadow-md">Add block</button>
            {conflicts && pending && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4"
                    role="presentation"
                    onClick={() => setConflicts(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="block-conflict-title"
                        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg dark:bg-stone-900"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 id="block-conflict-title" className="text-lg font-semibold text-stone-950 dark:text-stone-50">Appointments already booked</h2>
                        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                            This period already has booked appointments. A block does not cancel them, and no new visits can be booked in it.
                        </p>
                        <ul className="mt-3 flex flex-col gap-2 text-sm text-stone-800 dark:text-stone-100">
                            {conflicts.map((appointment) => (
                                <li key={appointment.id} className="rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-700">
                                    <span className="font-medium">{appointment.petName}</span>
                                    {" · "}
                                    {appointment.detail}
                                    <span className="mt-0.5 block text-stone-500">{formatVisit(appointment.startAt, appointment.duration)}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" autoFocus onClick={() => setConflicts(null)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-800 transition duration-200 hover:border-stone-400 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-100 dark:hover:border-stone-500 dark:hover:bg-stone-800">
                                Go back
                            </button>
                            <button type="button" onClick={() => save(pending, true)} className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white transition duration-200 hover:scale-[1.02] hover:bg-emerald-900 hover:shadow-md">
                                Block anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
