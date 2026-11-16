"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import type { AppointmentWithPet } from "../../../lib/types/appointments";
import { cancelAppointment } from "@/lib/actions/appointment";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { petPhotoSrc } from "@/lib/storage/files";
import SpeciesMark from "@/components/pets/SpeciesMark";

function when(startAt: Date | string, locale: Locale) {
    const date = new Date(startAt);
    const formatted = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
    return formatted.format(date);
}

function detail(appointment: AppointmentWithPet, copy: Copy) {
    if (appointment.type === "GROOMING") {
        const groom = appointment.groomingService === "HAIRCUT" ? copy.groomHaircut : appointment.groomingService === "BOTH" ? copy.groomBoth : appointment.groomingService === "SHOWER" ? copy.groomShower : "";
        return groom ? `${copy.typeGrooming} · ${groom}` : copy.typeGrooming;
    }
    if (appointment.type === "OPERATION") return copy.typeOperation;
    const services = appointment.services.map((service) => {
        if (service === "VACCINATION") return copy.svcVaccination;
        if (service === "DEWORMING") return copy.svcDeworming;
        if (service === "FLEA_TREATMENT") return copy.svcFlea;
        if (service === "FOLLOW_UP") return copy.svcFollowUp;
        return copy.svcCheckup;
    });
    return services.length > 0 ? `${copy.typeVisit} · ${services.join(", ")}` : copy.typeVisit;
}

export default function AppointmentCard({ appointment, copy, locale }: { appointment: AppointmentWithPet; copy: Copy; locale: Locale }) {
    const { pet } = appointment;
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const photo = petPhotoSrc(pet.id, pet.photoUrl);

    async function onCancel(event: MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
        event.stopPropagation();
        setCancelling(true);
        const result = await cancelAppointment(appointment.id);
        setCancelling(false);
        if (!result.success) {
            setError(result.formErrors[0] ?? "Could not cancel this appointment.");
            return;
        }
        router.refresh();
    }

    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 sm:flex-row sm:items-center dark:border-stone-700 dark:bg-stone-950">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    {photo ? (
                        <img src={photo} alt="" className="size-full object-cover" />
                    ) : (
                        <div className="flex size-full items-center justify-center">
                            <SpeciesMark species={pet.species} className="size-6" />
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <Link href={`/pets/${pet.id}`} className="truncate text-sm font-semibold text-emerald-950 hover:underline dark:text-emerald-50">{pet.name}</Link>
                    <p className="mt-0.5 text-sm text-stone-700 dark:text-stone-200">{detail(appointment, copy)}</p>
                    <p className="mt-0.5 text-sm text-stone-500">{when(appointment.startAt, locale)}</p>
                    {error && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>}
                </div>
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{copy.booked}</span>
                <button
                    type="button"
                    onClick={(event) => {
                        event.preventDefault();
                        router.push(`/appointments/${appointment.id}/reschedule`);
                    }}
                    className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-emerald-800 hover:text-emerald-800 dark:border-stone-600 dark:text-stone-200 dark:hover:border-emerald-300 dark:hover:text-emerald-200"
                >
                    {copy.moveVisit}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={cancelling}
                    className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-red-700 hover:text-red-700 disabled:opacity-60 dark:border-stone-600 dark:text-stone-200"
                >
                    {cancelling ? copy.cancellingVisit : copy.cancelVisit}
                </button>
            </div>
        </div>
    );
}
