"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronLeft } from "lucide-react";
import ClinicDateField from "@/components/ClinicDateField";
import { visitServiceLabels, visitServiceOrder } from "@/lib/appointments/labels";
import { bookingSchema, type BookingForm } from "@/lib/validations/appointment";
import { bookAppointment, getOpenings } from "@/lib/actions/appointment";
import type { Species } from "../../generated/prisma/client";

const appointmentTypes = [
    { value: "VETERINARY_VISIT", label: "Veterinary visit", detail: "Duration of this appointment is 30 minutes." },
    { value: "GROOMING", label: "Grooming", detail: "Duration of this appointment is 2 hours, with the grooming assistant." },
    { value: "OPERATION", label: "Operation", detail: "Duration of this appointment is 1 hour for a cat and 2 hours for a dog. Operations are booked in the morning." },
] as const;

const visitServices = visitServiceOrder.map((value) => ({ value, label: visitServiceLabels[value] }));

// The clinic has not written package descriptions yet. These say what the owner is choosing, without listing a price.
const groomingServices = [
    { value: "SHOWER", label: "Shower", detail: "A bath." },
    { value: "HAIRCUT", label: "Haircut", detail: "A trim." },
    { value: "BOTH", label: "Shower and haircut", detail: "A bath and a trim." },
] as const;

type BookablePet = { id: string; name: string; species: Species };

const fieldClassName =
    "w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 dark:border-emerald-900 dark:bg-stone-950 dark:text-emerald-50";

const selectClassName = `${fieldClassName} appearance-none pe-12`;

function FieldMessage({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="mt-1 text-xs font-normal text-red-700 dark:text-red-300">{message}</p>;
}

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
            petId: pets[0]?.id ?? "",
            type: "VETERINARY_VISIT",
            services: [],
            date: "",
            start: "",
        },
    });

    const petId = useWatch({ control: form.control, name: "petId" });
    const type = useWatch({ control: form.control, name: "type" });
    const services = useWatch({ control: form.control, name: "services" });
    const date = useWatch({ control: form.control, name: "date" });
    const start = useWatch({ control: form.control, name: "start" });

    useEffect(() => {
        if (type !== "VETERINARY_VISIT") form.setValue("services", []);
        if (type !== "GROOMING") form.setValue("groomingService", undefined);
    }, [type, form]);

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
            <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
                <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-stone-950">
                <section className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-white p-5 dark:border-emerald-900 dark:bg-stone-900">
                    <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                        <ChevronLeft className="size-4" strokeWidth={1.5} />
                        Back to dashboard
                    </Link>
                    <h1 className="text-2xl font-semibold text-emerald-950 dark:text-emerald-50">Book an appointment</h1>
                    <p className="text-sm text-emerald-900 dark:text-emerald-100">{emptyMessage ?? "Add a pet before booking a visit."}</p>
                    {!emptyMessage && (
                        <Link href="/pets/new" className="w-fit rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-900">
                            Add a pet
                        </Link>
                    )}
                </section>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
            <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-stone-950">
            <section className="rounded-2xl border border-emerald-200 bg-white p-5 dark:border-emerald-900 dark:bg-stone-900">
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                <ChevronLeft className="size-4" strokeWidth={1.5} />
                Back to dashboard
            </Link>
            <h1 className="mt-4 text-2xl font-semibold text-emerald-950 dark:text-emerald-50">Book an appointment</h1>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">Times are shown in Lebanon time. Sunday is closed.</p>

            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
                <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                    Pet
                    <span className="relative mt-1 block">
                    <select className={selectClassName} {...form.register("petId")}>
                        {pets.map((pet) => (
                            <option key={pet.id} value={pet.id}>
                                {pet.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-emerald-800 dark:text-emerald-200" />
                    </span>
                    <FieldMessage message={form.formState.errors.petId?.message} />
                </label>

                <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                    Type
                    <span className="relative mt-1 block">
                    <select className={selectClassName} {...form.register("type")}>
                        {appointmentTypes.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-emerald-800 dark:text-emerald-200" />
                    </span>
                    {type && (
                        <span className="mt-1 block text-xs font-normal text-emerald-800 dark:text-emerald-200">
                            {appointmentTypes.find((option) => option.value === type)?.detail}
                        </span>
                    )}
                    <FieldMessage message={form.formState.errors.type?.message} />
                </label>

                {type === "VETERINARY_VISIT" && (
                    <fieldset className="rounded-2xl border border-emerald-200 p-3">
                        <legend className="px-1 text-sm font-medium text-emerald-950 dark:text-emerald-50">Services</legend>
                        <div className="mt-2 flex flex-col gap-2">
                            {visitServices.map((service) => (
                                <label key={service.value} className="flex items-center gap-2 text-sm font-normal text-emerald-950 dark:text-emerald-50">
                                    <input
                                        type="checkbox"
                                        value={service.value}
                                        checked={(services ?? []).includes(service.value)}
                                        className="size-4"
                                        onChange={(event) => {
                                            const current = services ?? [];
                                            const next = event.target.checked
                                                ? [...current, service.value]
                                                : current.filter((selected) => selected !== service.value);
                                            form.setValue("services", next, { shouldValidate: form.formState.isSubmitted });
                                        }}
                                    />
                                    {service.label}
                                </label>
                            ))}
                        </div>
                        <FieldMessage message={form.formState.errors.services?.message} />
                    </fieldset>
                )}

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
                        <FieldMessage message={form.formState.errors.groomingService?.message} />
                    </fieldset>
                )}

                <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                    Date
                    <input type="hidden" {...form.register("date")} />
                    <ClinicDateField value={date} min={today} onChange={(next) => form.setValue("date", next, { shouldValidate: form.formState.isSubmitted })} />
                    <FieldMessage message={form.formState.errors.date?.message} />
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
                                onClick={() => form.setValue("start", slot, { shouldValidate: form.formState.isSubmitted })}
                                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                                    start === slot
                                        ? "border-emerald-800 bg-emerald-800 text-white hover:bg-emerald-900"
                                        : "border-emerald-200 bg-white text-emerald-950 hover:border-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-stone-950 dark:text-emerald-50 dark:hover:bg-emerald-950"
                                }`}
                            >
                                {formatSlot(slot, duration)}
                            </button>
                        ))}
                    </div>
                    {!(date && !loadingTimes && starts.length === 0) && (
                        <FieldMessage message={form.formState.errors.start?.message} />
                    )}
                </div>

                {formError && <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>}

                <button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white transition duration-200 hover:scale-[1.02] hover:bg-emerald-900 hover:shadow-md disabled:scale-100 disabled:opacity-60 disabled:hover:bg-emerald-800 disabled:hover:shadow-none dark:bg-emerald-700 dark:hover:bg-emerald-600"
                >
                    {form.formState.isSubmitting ? "Booking…" : "Book appointment"}
                </button>
            </form>
            </section>
            </div>
        </main>
    );
}
