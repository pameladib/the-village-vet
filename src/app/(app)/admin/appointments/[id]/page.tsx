import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { appointmentDetail } from "@/lib/appointments/labels";
import AppointmentOutcomes from "@/components/visits/AppointmentOutcomes";
import { requireRole } from "@/lib/auth/session";
import { canSeeClinicalRecords } from "@/lib/auth/permissions";
import { getLocale, messages } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { prisma } from "@/lib/prisma";

export default async function StaffAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
    let session;
    try {
        session = await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const { id } = await params;
    const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
            pet: { select: { id: true, name: true } },
            owner: { select: { name: true, phoneNumber: true } },
            medicalVisit: { select: { id: true } },
        },
    });
    if (!appointment) notFound();

    const locale = await getLocale();
    const copy = messages(locale);
    const clinical = canSeeClinicalRecords(session.user.role);
    const when = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).format(appointment.startAt);
    const canMove = appointment.status === "BOOKED" && appointment.startAt > new Date();
    const statusLabel = appointment.status === "COMPLETED"
        ? copy.statusCompleted
        : appointment.status === "EXPIRED"
            ? copy.statusMissed
            : appointment.status === "CANCELLED"
                ? copy.statusCancelled
                : copy.booked;

    return (
        <main className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6">
            <Link href="/admin/appointments" className="text-sm font-medium text-emerald-800">{copy.appointments}</Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{appointment.pet.name}</h1>
            <dl className="mt-6 flex flex-col gap-4 text-sm">
                <div>
                    <dt className="text-stone-500">{copy.columnTime}</dt>
                    <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{when}</dd>
                </div>
                <div>
                    <dt className="text-stone-500">{copy.columnPet}</dt>
                    <dd className="mt-0.5 text-stone-900 dark:text-stone-50">
                        {clinical ? <Link href={`/pets/${appointment.pet.id}`} className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{appointment.pet.name}</Link> : appointment.pet.name}
                    </dd>
                </div>
                <div>
                    <dt className="text-stone-500">{copy.columnOwner}</dt>
                    <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{appointment.owner.name}</dd>
                </div>
                <div>
                    <dt className="text-stone-500">{copy.phone}</dt>
                    <dd className="mt-0.5"><a href={`tel:${appointment.owner.phoneNumber}`} className="text-emerald-900 hover:underline dark:text-emerald-200">{appointment.owner.phoneNumber}</a></dd>
                </div>
                <div>
                    <dt className="text-stone-500">{copy.columnService}</dt>
                    <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{appointmentDetail(appointment.type, appointment.services, appointment.groomingService, copy)}</dd>
                </div>
                <div>
                    <dt className="text-stone-500">{copy.appointmentStatus}</dt>
                    <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{statusLabel}</dd>
                </div>
            </dl>
            {appointment.status === "BOOKED" && (
                <div className="mt-6">
                    <AppointmentOutcomes id={appointment.id} type={appointment.type} passed={appointment.startAt.getTime() < Date.now()} canWrite={clinical} copy={copy} />
                </div>
            )}
            {appointment.medicalVisit && clinical && (
                <Link href={`/pets/${appointment.pet.id}/visits/${appointment.medicalVisit.id}`} className="mt-4 inline-flex text-sm font-medium text-emerald-900 hover:underline dark:text-emerald-200">
                    {copy.openVisit}
                </Link>
            )}
            {canMove && (
                <Link href={`/appointments/${appointment.id}/reschedule`} className="mt-6 inline-flex rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-950">
                    {copy.reschedule}
                </Link>
            )}
        </main>
    );
}
