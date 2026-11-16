import { appointmentTypeLabels, formatVisitServices, groomingServiceLabels } from "@/lib/appointments/labels";
import type { PetProfileData, ProfileAppointment } from "../PetProfile";

function startTime(value: Date | string) {
    const date = value instanceof Date ? value : new Date(value);
    return date.getTime();
}

function formatAppointmentDate(startAt: Date | string) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Beirut",
        weekday: "short",
        month: "short",
        day: "numeric",
    }).format(new Date(startTime(startAt)));
}

function formatAppointmentTime(startAt: Date | string) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Beirut",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(startTime(startAt)));
}

function AppointmentCard({ appointment }: { appointment: ProfileAppointment }) {
    return (
        <div className="rounded-2xl bg-stone-100 px-3.5 py-3.5 dark:bg-stone-900">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                {appointmentTypeLabels[appointment.type]}
            </p>
            {appointment.type === "VETERINARY_VISIT" && appointment.services.length > 0 && (
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{formatVisitServices(appointment.services)}</p>
            )}
            {appointment.type === "GROOMING" && appointment.groomingService && (
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{groomingServiceLabels[appointment.groomingService]}</p>
            )}
            <p className="mt-1 text-sm text-stone-900 dark:text-stone-50">
                {formatAppointmentDate(appointment.startAt)} · {formatAppointmentTime(appointment.startAt)} · {appointment.duration} min
            </p>
        </div>
    );
}

function AppointmentList({ appointments, empty }: { appointments: ProfileAppointment[]; empty: string }) {
    if (appointments.length === 0) {
        return (
            <p className="rounded-2xl bg-stone-100 px-3.5 py-3.5 text-sm text-stone-400 dark:bg-stone-900 dark:text-stone-500">
                {empty}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {appointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
            ))}
        </div>
    );
}

export default function AppointmentsTab({ pet }: { pet: PetProfileData }) {
    const now = Date.now();
    const upcoming = pet.appointments
        .filter((appointment) => startTime(appointment.startAt) >= now)
        .sort((left, right) => startTime(left.startAt) - startTime(right.startAt));
    const previous = pet.appointments
        .filter((appointment) => startTime(appointment.startAt) < now)
        .sort((left, right) => startTime(right.startAt) - startTime(left.startAt));

    return (
        <div className="flex flex-col gap-6">
            <section>
                <h3 className="mb-2 text-sm font-medium text-emerald-900 dark:text-emerald-200">Upcoming</h3>
                <AppointmentList appointments={upcoming} empty="No upcoming appointments" />
            </section>
            <section>
                <h3 className="mb-2 text-sm font-medium text-emerald-900 dark:text-emerald-200">Previous</h3>
                <AppointmentList appointments={previous} empty="No previous appointments" />
            </section>
        </div>
    );
}
