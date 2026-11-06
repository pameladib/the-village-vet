"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { bookingSchema, type BookingForm } from "@/lib/validations/appointment";
import { bookAppointment, getOpenings } from "@/lib/actions/appointment";
import type { Species } from "../../generated/prisma/client";

const appointmentTypes = [
    { value: "CHECKUP", label: "Check-up", detail: "30 minutes" },
    { value: "VACCINATION", label: "Vaccination", detail: "30 minutes" },
    { value: "TREATMENT", label: "Treatment", detail: "30 minutes" },
    { value: "FOLLOW_UP", label: "Follow-up", detail: "30 minutes" },
    { value: "GROOMING", label: "Grooming", detail: "2 hours, with the grooming assistant" },
    { value: "OPERATION", label: "Operation", detail: "Morning only. 1 hour for a cat, 2 hours for a dog" },
] as const;

// The clinic has not written package descriptions yet. These say what the owner is choosing, without listing a price.
const groomingServices = [
    { value: "SHOWER", label: "Shower", detail: "A bath." },
    { value: "HAIRCUT", label: "Haircut", detail: "A trim." },
    { value: "BOTH", label: "Shower and haircut", detail: "A bath and a trim." },
] as const;

type BookablePet = { id: string; name: string; species: Species };

const fieldClassName =
    "mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 dark:border-emerald-900 dark:bg-stone-950 dark:text-emerald-50";

function formatSlot(startIso: string, duration: number) {
    const start = new Date(startIso);
    const end = new Date(start.getTime() + duration * 60_000);
    const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Beirut",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    return `${time.format(start)}–${time.format(end)}`;
}

export default function NewAppointmentForm({ pets, today, emptyMessage }: { pets: BookablePet[]; today: string; emptyMessage?: string }) {
    const router = useRouter();
    const [formError, setFormError] = useState<string | null>(null);
    const [starts, setStarts] = useState<string[]>([]);
    const [duration, setDuration] = useState(0);
    const [loadingTimes, setLoadingTimes] = useState(false);

    const form = useForm<BookingForm>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            petId: pets.length === 1 ? pets[0].id : "",
            date: "",
            start: "",
        },
    });

    const petId = useWatch({ control: form.control, name: "petId" });
    const type = useWatch({ control: form.control, name: "type" });
    const date = useWatch({ control: form.control, name: "date" });
    const start = useWatch({ control: form.control, name: "start" });

    useEffect(() => {
        if (!petId || !type || !date) {
            setStarts([]);
            return;
        }

        let cancelled = false;
        setLoadingTimes(true);
        setFormError(null);
        form.setValue("start", "");

        getOpenings({ petId, type, date }).then((result) => {
            if (cancelled) return;
            setLoadingTimes(false);
            if (!result.success) {
                setStarts([]);
                setFormError(result.formErrors[0] ?? "Could not load times.");
                return;
            }
            setStarts(result.starts);
            setDuration(result.duration);
        });

        return () => {
            cancelled = true;
        };
    }, [petId, type, date, form]);

    async function onSubmit(data: BookingForm) {
        setFormError(null);
        const result = await bookAppointment(data);
        if (!result.success) {
            setFormError(result.formErrors[0] ?? "Could not book this appointment.");
            return;
        }
        router.push("/dashboard");
        router.refresh();
    }

    if (pets.length === 0) {
        return (
            <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 bg-emerald-50 px-4 py-8 dark:bg-stone-950">
                <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    <ChevronLeft className="size-4" strokeWidth={1.5} />
                    Back to dashboard
                </Link>
                <h1 className="text-2xl font-semibold text-emerald-950 dark:text-emerald-50">Book an appointment</h1>
                <p className="text-sm text-emerald-900 dark:text-emerald-100">{emptyMessage ?? "Add a pet before booking a visit."}</p>
                {!emptyMessage && (
                <Link href="/pets/new" className="w-fit rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white">
                    Add a pet
                </Link>
                )}
            </main>
        );
    }

    return (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col bg-emerald-50 px-4 py-8 dark:bg-stone-950">
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                <ChevronLeft className="size-4" strokeWidth={1.5} />
                Back to dashboard
            </Link>
            <h1 className="mt-4 text-2xl font-semibold text-emerald-950 dark:text-emerald-50">Book an appointment</h1>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">Times are shown in Lebanon time. Sunday is closed.</p>

            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
                <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                    Pet
                    <select className={fieldClassName} {...form.register("petId")}>
                        <option value="">Choose a pet</option>
                        {pets.map((pet) => (
                            <option key={pet.id} value={pet.id}>
                                {pet.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                    Type
                    <select className={fieldClassName} {...form.register("type")}>
                        <option value="">Choose a type</option>
                        {appointmentTypes.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {type && (
                        <span className="mt-1 block text-xs font-normal text-emerald-800 dark:text-emerald-200">
                            {appointmentTypes.find((option) => option.value === type)?.detail}
                        </span>
                    )}
                </label>

                {type === "GROOMING" && (
                    <fieldset className="rounded-2xl border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-stone-900">
                        <legend className="px-1 text-sm font-medium text-emerald-950 dark:text-emerald-50">Grooming</legend>
                        <div className="mt-2 flex flex-col gap-2">
                            {groomingServices.map((service) => (
                                <label key={service.value} className="flex items-start gap-2 text-sm text-emerald-950 dark:text-emerald-50">
                                    <input type="radio" value={service.value} className="mt-1" {...form.register("groomingService")} />
                                    <span>
                                        <span className="font-medium">{service.label}</span>
                                        <span className="mt-0.5 block text-xs text-emerald-800 dark:text-emerald-200">{service.detail}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                )}

                <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                    Date
                    <input type="date" min={today} className={fieldClassName} {...form.register("date")} />
                </label>

                <div>
                    <p className="text-sm font-medium text-emerald-950 dark:text-emerald-50">Time</p>
                    {loadingTimes && <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">Loading times…</p>}
                    {!loadingTimes && type && date && starts.length === 0 && (
                        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">No open times on this day.</p>
                    )}
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        {starts.map((slot) => (
                            <button
                                key={slot}
                                type="button"
                                onClick={() => form.setValue("start", slot, { shouldValidate: true })}
                                className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
                                    start === slot
                                        ? "border-emerald-800 bg-emerald-800 text-white"
                                        : "border-emerald-200 bg-white text-emerald-950 dark:border-emerald-900 dark:bg-stone-900 dark:text-emerald-50"
                                }`}
                            >
                                {formatSlot(slot, duration)}
                            </button>
                        ))}
                    </div>
                </div>

                {formError && <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>}

                <button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-emerald-700"
                >
                    {form.formState.isSubmitting ? "Booking…" : "Book appointment"}
                </button>
            </form>
        </main>
    );
}
