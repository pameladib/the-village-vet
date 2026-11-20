import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import HistoryBack from "@/components/HistoryBack";
import { notFound, redirect } from "next/navigation";
import { appointmentDetail } from "@/lib/appointments/labels";
import AppointmentOutcomes from "@/components/visits/AppointmentOutcomes";
import { requireRole } from "@/lib/auth/session";
import { canSeeClinicalRecords } from "@/lib/auth/permissions";
import { getLocale, messages } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { prisma } from "@/lib/prisma";
import { pageKey } from "@/lib/slug";

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
            pet: { select: { id: true, slug: true, name: true } },
            owner: { select: { id: true, name: true, phoneNumber: true } },
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
    const service = appointmentDetail(appointment.type, appointment.services, appointment.groomingService, copy);
    const statusLabel = appointment.status === "COMPLETED"
        ? copy.statusCompleted
        : appointment.status === "EXPIRED"
            ? copy.statusMissed
            : appointment.status === "CANCELLED"
                ? copy.statusCancelled
                : copy.booked;

    return (
        <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
            <HistoryBack fallback="/admin/appointments" className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-emerald-900 hover:underline dark:text-emerald-200">
                <ChevronLeft className="size-4 rtl:rotate-180" />
                {copy.profileBack}
            </HistoryBack>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{appointment.pet.name}</h1>
            <section className="mt-6 rounded-2xl border border-stone-200 bg-white px-5 py-5 dark:border-stone-800 dark:bg-stone-900">
                <div className="grid gap-6 sm:grid-cols-2">
                    <dl className="grid gap-5">
                        <Field label={copy.appointmentDateTime} value={when} />
                        <Field label={copy.columnService} value={service} />
                        <Field label={copy.appointmentStatus} value={statusLabel} />
                    </dl>
                    <dl className="grid gap-5">
                        <div>
                            <dt className="text-xs text-stone-500">{copy.columnPet}</dt>
                            <dd className="mt-1 text-base font-medium text-stone-900 dark:text-stone-50">
                                {clinical ? <Link href={`/pets/${pageKey(appointment.pet)}`} className="text-emerald-900 hover:underline dark:text-emerald-200">{appointment.pet.name}</Link> : appointment.pet.name}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-stone-500">{copy.columnOwner}</dt>
                            <dd className="mt-1 text-base font-medium text-stone-900 dark:text-stone-50">
                                <Link href={`/admin/owners/${appointment.owner.id}`} className="text-emerald-900 hover:underline dark:text-emerald-200">{appointment.owner.name}</Link>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-stone-500">{copy.phone}</dt>
                            <dd className="mt-1 text-base font-medium text-stone-900 dark:text-stone-50">
                                <a href={`tel:${appointment.owner.phoneNumber}`} className="text-emerald-900 hover:underline dark:text-emerald-200">{appointment.owner.phoneNumber}</a>
                            </dd>
                        </div>
                    </dl>
                </div>
            </section>
            {appointment.status === "BOOKED" && (
                <div className="mt-6">
                    <AppointmentOutcomes id={appointment.id} type={appointment.type} passed={appointment.startAt.getTime() < Date.now()} canWrite={clinical} copy={copy} />
                </div>
            )}
            {appointment.medicalVisit && clinical && (
                <Link href={`/pets/${pageKey(appointment.pet)}/visits/${appointment.medicalVisit.id}`} className="mt-4 inline-flex text-sm font-medium text-emerald-900 hover:underline dark:text-emerald-200">
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

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs text-stone-500">{label}</dt>
            <dd className="mt-1 text-base font-medium text-stone-900 dark:text-stone-50">{value}</dd>
        </div>
    );
}
