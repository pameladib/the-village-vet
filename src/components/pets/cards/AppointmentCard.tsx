"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import type { AppointmentWithPet } from "../../../lib/types/appointments";
import { appointmentTypeLabels, formatVisitServices, groomingServiceLabels } from "@/lib/appointments/labels";
import { cancelAppointment } from "@/lib/actions/appointment";
import { petPhotoSrc } from "@/lib/storage/files";

function formatAppointmentDate(startAt: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Beirut",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(startAt);
}

function formatAppointmentTime(startAt: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Beirut",
    hour: "numeric",
    minute: "2-digit",
  }).format(startAt);
}

export default function AppointmentCard({ appointment }: { appointment: AppointmentWithPet }) {
  const { pet } = appointment;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

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
    <div
      className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-700 dark:bg-stone-900"
    >
      <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
        {petPhotoSrc(pet.id, pet.photoUrl) ? (
          <img src={petPhotoSrc(pet.id, pet.photoUrl) ?? ""} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-xl font-medium text-stone-400 dark:text-stone-500">
            {pet.name.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/pets/${pet.id}`} className="truncate text-sm font-medium text-stone-900 group-hover:text-emerald-800 dark:text-stone-50 dark:group-hover:text-emerald-300" onClick={(event) => event.stopPropagation()}>
          {pet.name}
        </Link>
        <p className="mt-0.5 text-sm text-emerald-800 dark:text-emerald-300">
          {appointmentTypeLabels[appointment.type]}
        </p>
        {appointment.type === "VETERINARY_VISIT" && appointment.services.length > 0 && (
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">{formatVisitServices(appointment.services)}</p>
        )}
        {appointment.type === "GROOMING" && appointment.groomingService && (
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">{groomingServiceLabels[appointment.groomingService]}</p>
        )}
        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
          {formatAppointmentDate(appointment.startAt)} · {formatAppointmentTime(appointment.startAt)} · {appointment.duration} min
        </p>
        {error && <p className="mt-1 text-xs text-red-700 dark:text-red-300">{error}</p>}
      </div>
      <button
        type="button"
        onClick={onCancel}
        disabled={cancelling}
        className="shrink-0 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:border-red-700 hover:text-red-700 disabled:opacity-60 dark:border-stone-600 dark:text-stone-200"
      >
        {cancelling ? "Cancelling…" : "Cancel"}
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          router.push(`/appointments/${appointment.id}/reschedule`);
        }}
        className="shrink-0 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:border-emerald-800 hover:text-emerald-800 dark:border-stone-600 dark:text-stone-200 dark:hover:border-emerald-300 dark:hover:text-emerald-300"
      >
        Move
      </button>
    </div>
  );
}
