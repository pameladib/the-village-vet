import Link from "next/link";
import type { AppointmentType } from "../../../../generated/prisma/client";
import type { AppointmentWithPet } from "../../../lib/types/appointments";


// appointmentTypeLabels is an object with keys and values used for converting appointment type enum values into user-friendly, readable labels
// we access the value using its key: appointmentTypeLabels.CHECKUP; // "Checkup"
const appointmentTypeLabels: Record<AppointmentType, string> = { // Record is a TS utility type 
  CHECKUP: "Checkup",
  VACCINATION: "Vaccination",
  TREATMENT: "Deworming / Flea Treatment",
  GROOMING: "Grooming",
  OPERATION: "Operation",
};

function formatAppointmentDate(startAt: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(startAt);
}

function formatAppointmentTime(startAt: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(startAt);
}

export default function AppointmentCard({ appointment }: { appointment: AppointmentWithPet }) {
  const { pet } = appointment;

  return (
    <Link
      href={`/pets/${pet.id}`}
      className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition duration-200 hover:scale-[1.02] hover:border-emerald-700 hover:bg-emerald-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-emerald-400 dark:hover:bg-emerald-950/40"
    >
      <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
        {pet.photoUrl ? (
          <img src={pet.photoUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-xl font-medium text-stone-400 dark:text-stone-500">
            {pet.name.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-stone-900 group-hover:text-emerald-800 dark:text-stone-50 dark:group-hover:text-emerald-300">
          {pet.name}
        </p>
        <p className="mt-0.5 text-sm text-emerald-800 dark:text-emerald-300">
          {appointmentTypeLabels[appointment.type]}
        </p>
        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
          {formatAppointmentDate(appointment.startAt)} · {formatAppointmentTime(appointment.startAt)} · {appointment.duration} min
        </p>
      </div>
    </Link>
  );
}
