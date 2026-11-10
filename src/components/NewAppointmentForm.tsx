"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronLeft, CircleCheck } from "lucide-react";
import ClinicDateField from "@/components/ClinicDateField";
import { visitServiceOrder } from "@/lib/appointments/labels";
import { bookingSchema, type BookingForm } from "@/lib/validations/appointment";
import { bookAppointment, getOpenings } from "@/lib/actions/appointment";
import { intlLocale } from "@/lib/intl-locale";
import type { Copy, Locale } from "@/lib/i18n";
import type { Species } from "../../generated/prisma/client";

const bookingErrors = {
    "Choose a pet.": "errChoosePet",
    "Choose an appointment type.": "errChooseType",
    "Choose a date.": "errChooseDate",
    "Choose a valid date.": "errChooseValidDate",
    "Choose a time.": "errChooseTime",
    "Choose a valid time.": "errChooseValidTime",
    "Choose at least one service.": "errChooseService",
    "Services belong on a veterinary visit.": "errServicesVisit",
    "Choose a grooming service.": "errChooseGrooming",
    "Could not load times.": "errLoadTimes",
    "Could not book this appointment.": "errBookFailed",
    "You need to sign in.": "errSignIn",
    "We couldn't find this pet.": "errPetMissing",
    "That time is no longer available.": "errTimeTaken",
} as const satisfies Record<string, keyof Copy>;

function bookingMessage(copy: Copy, message?: string) {
    if (!message) return undefined;
    const key = bookingErrors[message as keyof typeof bookingErrors];
    return key ? copy[key] : message;
}

function appointmentTypes(copy: Copy) {
    return [
        { value: "VETERINARY_VISIT" as const, label: copy.typeVisit, detail: copy.typeVisitDetail },
        { value: "GROOMING" as const, label: copy.serviceGroomingTitle, detail: copy.typeGroomingDetail },
        { value: "OPERATION" as const, label: copy.typeOperation, detail: copy.typeOperationDetail },
    ];
}

function visitServices(copy: Copy) {
    const labels = {
        CHECKUP: copy.svcCheckup,
        VACCINATION: copy.svcVaccination,
        DEWORMING: copy.svcDeworming,
        FLEA_TREATMENT: copy.svcFlea,
        FOLLOW_UP: copy.svcFollowUp,
    };
    return visitServiceOrder.map((value) => ({ value, label: labels[value] }));
}

function groomingServices(copy: Copy) {
    return [
        { value: "SHOWER" as const, label: copy.groomShower, detail: copy.groomShowerDetail },
        { value: "HAIRCUT" as const, label: copy.groomHaircut, detail: copy.groomHaircutDetail },
        { value: "BOTH" as const, label: copy.groomBoth, detail: copy.groomBothDetail },
    ];
}

type BookablePet = { id: string; name: string; species: Species };

const fieldClassName =
    "w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 dark:border-emerald-900 dark:bg-stone-950 dark:text-emerald-50";

const selectClassName = `${fieldClassName} appearance-none pe-12`;

function FieldMessage({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="mt-1 text-xs font-normal text-red-700 dark:text-red-300">{message}</p>;
}

function formatSlot(startIso: string, duration: number, locale: Locale) {
    const start = new Date(startIso);
    const end = new Date(start.getTime() + duration * 60_000);
    const time = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    return `${time.format(start)}–${time.format(end)}`;
}

export default function NewAppointmentForm({ pets, today, emptyMessage, copy, locale }: { pets: BookablePet[]; today: string; emptyMessage?: string; copy: Copy; locale: Locale }) {
    const types = appointmentTypes(copy);
    const servicesForVisit = visitServices(copy);
    const groomingChoices = groomingServices(copy);
    const router = useRouter();
    const [formError, setFormError] = useState<string | null>(null);
    const [starts, setStarts] = useState<string[]>([]);
    const [duration, setDuration] = useState(0);
    const [loadingTimes, setLoadingTimes] = useState(false);
    const [booked, setBooked] = useState(false);

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
                setFormError(bookingMessage(copy, result.formErrors[0] ?? "Could not load times.") ?? copy.errLoadTimes);
                return;
            }
            setStarts(result.starts);
            setDuration(result.duration);
        });

        return () => {
            cancelled = true;
        };
    }, [petId, type, date, form, copy]);

    async function onSubmit(data: BookingForm) {
        setFormError(null);
        const result = await bookAppointment(data);
        if (!result.success) {
            setFormError(bookingMessage(copy, result.formErrors[0] ?? "Could not book this appointment.") ?? copy.errBookFailed);
            return;
        }
        setBooked(true);
    }

    useEffect(() => {
        if (!booked) return;
        const timer = window.setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
        }, 3000);
        return () => window.clearTimeout(timer);
    }, [booked, router]);

    if (pets.length === 0) {
        return (
            <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
                <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-stone-950">
                <section className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-white p-5 dark:border-emerald-900 dark:bg-stone-900">
                    <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                        <ChevronLeft className="size-4 rtl:rotate-180" strokeWidth={1.5} />
                        {copy.bookBack}
                    </Link>
                    <h1 className="text-2xl font-semibold text-emerald-950 dark:text-emerald-50">{copy.bookAppointment}</h1>
                    <p className="text-sm text-emerald-900 dark:text-emerald-100">{emptyMessage ?? copy.bookEmpty}</p>
                    {!emptyMessage && (
                        <Link href="/pets/new" className="w-fit rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-900">
                            {copy.bookAddPet}
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
                <ChevronLeft className="size-4 rtl:rotate-180" strokeWidth={1.5} />
                {copy.bookBack}
            </Link>
            <h1 className="mt-4 text-2xl font-semibold text-emerald-950 dark:text-emerald-50">{copy.bookAppointment}</h1>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">{copy.bookLead}</p>

            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
                <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                    {copy.bookPet}
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
                    <FieldMessage message={bookingMessage(copy, form.formState.errors.petId?.message)} />
                </label>

                <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                    {copy.bookType}
                    <span className="relative mt-1 block">
                    <select className={selectClassName} {...form.register("type")}>
                        {types.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-emerald-800 dark:text-emerald-200" />
                    </span>
                    {type && (
                        <span className="mt-1 block text-xs font-normal text-emerald-800 dark:text-emerald-200">
                            {types.find((option) => option.value === type)?.detail}
                        </span>
                    )}
                    <FieldMessage message={bookingMessage(copy, form.formState.errors.type?.message)} />
                </label>

                {type === "VETERINARY_VISIT" && (
                    <fieldset className="rounded-2xl border border-emerald-200 p-3">
                        <legend className="px-1 text-sm font-medium text-emerald-950 dark:text-emerald-50">{copy.bookServices}</legend>
                        <div className="mt-2 flex flex-col gap-2">
                            {servicesForVisit.map((service) => (
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
                        <FieldMessage message={bookingMessage(copy, form.formState.errors.services?.message)} />
                    </fieldset>
                )}

                {type === "GROOMING" && (
                    <fieldset className="rounded-2xl border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-stone-900">
                        <legend className="px-1 text-sm font-medium text-emerald-950 dark:text-emerald-50">{copy.serviceGroomingTitle}</legend>
                        <div className="mt-2 flex flex-col gap-2">
                            {groomingChoices.map((service) => (
                                <label key={service.value} className="flex items-start gap-2 text-sm text-emerald-950 dark:text-emerald-50">
                                    <input type="radio" value={service.value} className="mt-1" {...form.register("groomingService")} />
                                    <span>
                                        <span className="font-medium">{service.label}</span>
                                        <span className="mt-0.5 block text-xs text-emerald-800 dark:text-emerald-200">{service.detail}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                        <FieldMessage message={bookingMessage(copy, form.formState.errors.groomingService?.message)} />
                    </fieldset>
                )}

                <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                    {copy.bookDate}
                    <input type="hidden" {...form.register("date")} />
                    <ClinicDateField value={date} min={today} locale={locale} copy={copy} onChange={(next) => form.setValue("date", next, { shouldValidate: form.formState.isSubmitted })} />
                    <FieldMessage message={bookingMessage(copy, form.formState.errors.date?.message)} />
                </label>

                <div>
                    <p className="text-sm font-medium text-emerald-950 dark:text-emerald-50">{copy.bookTime}</p>
                    {loadingTimes && <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">{copy.bookLoadingTimes}</p>}
                    {!loadingTimes && type && date && starts.length === 0 && (
                        <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">{copy.bookNoTimes}</p>
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
                                {formatSlot(slot, duration, locale)}
                            </button>
                        ))}
                    </div>
                    {!(date && !loadingTimes && starts.length === 0) && (
                        <FieldMessage message={bookingMessage(copy, form.formState.errors.start?.message)} />
                    )}
                </div>

                {formError && <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>}

                <button
                    type="submit"
                    disabled={form.formState.isSubmitting || booked}
                    className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white transition duration-200 hover:scale-[1.02] hover:bg-emerald-900 hover:shadow-md disabled:scale-100 disabled:opacity-60 disabled:hover:bg-emerald-800 disabled:hover:shadow-none dark:bg-emerald-700 dark:hover:bg-emerald-600"
                >
                    {form.formState.isSubmitting ? copy.bookSubmitting : copy.bookSubmit}
                </button>
            </form>
            </section>
            </div>
            {booked && (
                <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4" role="status">
                    <p className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-950 shadow-lg dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50">
                        <CircleCheck className="size-5 shrink-0" strokeWidth={1.75} />
                        {copy.bookedToast}
                    </p>
                </div>
            )}
        </main>
    );
}
