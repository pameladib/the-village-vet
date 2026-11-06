"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOpenings, rescheduleAppointment } from "@/lib/actions/appointment";
import type { AppointmentType, Species } from "../../generated/prisma/client";

export default function RescheduleForm({
    appointmentId,
    petId,
    type,
    species,
    today,
}: {
    appointmentId: string;
    petId: string;
    type: AppointmentType;
    species: Species;
    today: string;
}) {
    const router = useRouter();
    const [date, setDate] = useState("");
    const [starts, setStarts] = useState<string[]>([]);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (!date) return;
        let cancelled = false;
        getOpenings({ petId, type, date }).then((result) => {
            if (cancelled) return;
            if (!result.success) {
                setError(result.formErrors[0] ?? "Could not load times.");
                setStarts([]);
                return;
            }
            setError(null);
            setStarts(result.starts);
            setDuration(result.duration);
        });
        return () => {
            cancelled = true;
        };
    }, [date, petId, type]);

    const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Beirut",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });

    return (
        <form className="mt-6 flex flex-col gap-4">
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                Date
                <input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-xl border border-emerald-200 px-3 py-2.5 text-sm dark:border-emerald-900 dark:bg-stone-950" />
            </label>
            <div className="grid grid-cols-2 gap-2">
                {starts.map((start) => (
                    <button
                        key={start}
                        type="button"
                        disabled={pending}
                        onClick={async () => {
                            setPending(true);
                            const result = await rescheduleAppointment({ appointmentId, date, start });
                            setPending(false);
                            if (!result.success) {
                                setError(result.formErrors[0] ?? "Could not move this visit.");
                                return;
                            }
                            router.push("/dashboard");
                            router.refresh();
                        }}
                        className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-medium text-emerald-950 dark:border-emerald-900 dark:bg-stone-900 dark:text-emerald-50"
                    >
                        {time.format(new Date(start))}–{time.format(new Date(new Date(start).getTime() + duration * 60_000))}
                    </button>
                ))}
            </div>
            {date && starts.length === 0 && <p className="text-sm text-emerald-800">No open times on this day.</p>}
            {error && <p className="text-sm text-red-700">{error}</p>}
        </form>
    );
}
