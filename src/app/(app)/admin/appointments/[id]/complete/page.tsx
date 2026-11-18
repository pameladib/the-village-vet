import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import VisitForm from "@/components/visits/VisitForm";
import { appointmentDetail } from "@/lib/appointments/labels";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { prisma } from "@/lib/prisma";
import { isClinicalAppointment } from "@/lib/visits/rules";

export default async function CompleteVisitPage({ params }: { params: Promise<{ id: string }> }) {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const { id } = await params;
    const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
            pet: { select: { id: true, name: true } },
            medicalVisit: { select: { id: true } },
        },
    });
    if (!appointment) notFound();
    if (appointment.medicalVisit) redirect(`/pets/${appointment.pet.id}/visits/${appointment.medicalVisit.id}`);
    if (!isClinicalAppointment(appointment.type) || appointment.status !== "BOOKED") redirect(`/admin/appointments/${appointment.id}`);

    const locale = await getLocale();
    const copy = messages(locale);
    const when = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).format(appointment.startAt);

    return (
        <main className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6">
            <Link href={`/admin/appointments/${appointment.id}`} className="text-sm font-medium text-emerald-800">{copy.appointments}</Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.completeVisit}</h1>
            <VisitForm
                copy={copy}
                mode={{
                    kind: "complete",
                    appointmentId: appointment.id,
                    petName: appointment.pet.name,
                    when,
                    detail: appointmentDetail(appointment.type, appointment.services, appointment.groomingService, copy),
                }}
            />
        </main>
    );
}
