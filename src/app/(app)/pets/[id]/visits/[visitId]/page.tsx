import HistoryBack from "@/components/HistoryBack";
import { notFound, redirect } from "next/navigation";
import DeleteVisit from "@/components/visits/DeleteVisit";
import VisitForm from "@/components/visits/VisitForm";
import { appointmentDetail } from "@/lib/appointments/labels";
import { calendarDateInBeirut } from "@/lib/appointments/availability";
import { requireRole } from "@/lib/auth/session";
import { doseCopyKey } from "@/lib/clinic/vaccines";
import { getLocale, messages } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { prisma } from "@/lib/prisma";

export default async function VisitPage({ params }: { params: Promise<{ id: string; visitId: string }> }) {
    let session;
    try {
        session = await requireRole(["OWNER", "ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const { id, visitId } = await params;
    const visit = await prisma.medicalVisit.findFirst({
        where: { id: visitId, petId: id },
        include: {
            pet: { select: { id: true, name: true, ownerId: true } },
            vaccinations: { select: { id: true, type: true, administeredAt: true }, orderBy: { administeredAt: "desc" } },
            treatments: { select: { id: true, type: true, administeredAt: true }, orderBy: { administeredAt: "desc" } },
        },
    });
    if (!visit) notFound();
    if (session.user.role === "OWNER" && visit.pet.ownerId !== session.user.id) notFound();

    const locale = await getLocale();
    const copy = messages(locale);
    const canWrite = session.user.role === "ADMIN";
    const when = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        ...(visit.appointmentId ? { hour: "2-digit" as const, minute: "2-digit" as const, hourCycle: "h23" as const } : {}),
    }).format(visit.visitedAt);
    const linked = Boolean(visit.appointmentId);

    return (
        <main className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6">
            <HistoryBack fallback={`/pets/${visit.pet.id}`} className="cursor-pointer text-sm font-medium text-emerald-800">{visit.pet.name}</HistoryBack>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">
                {appointmentDetail(visit.type, visit.services, null, copy)}
            </h1>
            <p className="mt-1 text-sm text-stone-500">{when}</p>

            {canWrite ? (
                <VisitForm
                    copy={copy}
                    mode={{
                        kind: "edit",
                        visitId: visit.id,
                        linked,
                        date: linked ? when : calendarDateInBeirut(visit.visitedAt),
                        visitType: visit.type === "OPERATION" ? "OPERATION" : "VETERINARY_VISIT",
                        services: visit.services,
                        notes: visit.notes ?? "",
                    }}
                />
            ) : (
                <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-stone-800 dark:text-stone-100">{visit.notes?.trim() || copy.noVisitNotes}</p>
            )}

            <section className="mt-8">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.visitLinkedVaccines}</h2>
                {visit.vaccinations.length === 0 ? (
                    <p className="mt-2 text-sm text-stone-500">{copy.visitNoneGiven}</p>
                ) : (
                    <ul className="mt-2 flex flex-col gap-1">
                        {visit.vaccinations.map((row) => {
                            const key = doseCopyKey(row.type) ?? "doseAnnual";
                            return <li key={row.id} className="text-sm text-stone-800 dark:text-stone-100">{copy[key]}</li>;
                        })}
                    </ul>
                )}
            </section>

            <section className="mt-6">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.visitLinkedTreatments}</h2>
                {visit.treatments.length === 0 ? (
                    <p className="mt-2 text-sm text-stone-500">{copy.visitNoneGiven}</p>
                ) : (
                    <ul className="mt-2 flex flex-col gap-1">
                        {visit.treatments.map((row) => (
                            <li key={row.id} className="text-sm text-stone-800 dark:text-stone-100">{row.type === "DEWORMING" ? copy.doseDeworming : copy.doseFlea}</li>
                        ))}
                    </ul>
                )}
            </section>

            {canWrite && visit.vaccinations.length === 0 && visit.treatments.length === 0 && (
                <DeleteVisit visitId={visit.id} petId={visit.pet.id} copy={copy} />
            )}
            {canWrite && (visit.vaccinations.length > 0 || visit.treatments.length > 0) && (
                <p className="mt-6 text-sm text-stone-500">{copy.visitDeleteBlocked}</p>
            )}
        </main>
    );
}
