import { notFound, redirect } from "next/navigation";
import RescheduleForm from "@/components/RescheduleForm";
import { todayInBeirut } from "@/lib/appointments/availability";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let session;
    try {
        session = await requireRole(["OWNER", "ADMIN", "SECONDARY_ADMIN"]);
    } catch (error) {
        if (error instanceof Error && (error.message === "User is not authenticated" || error.message === "User does not have the required role")) {
            redirect("/login");
        }
        throw error;
    }

    const appointment = await prisma.appointment.findFirst({
        where: session.user.role === "OWNER"
            ? { id, ownerId: session.user.id, status: "BOOKED" }
            : { id, status: "BOOKED" },
        include: { pet: { select: { id: true, name: true, species: true } } },
    });
    if (!appointment || appointment.startAt <= new Date()) notFound();

    const locale = await getLocale();
    const copy = messages(locale);

    return (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col bg-emerald-50 px-4 py-8 dark:bg-stone-950">
            <h1 className="text-2xl font-semibold text-emerald-950 dark:text-emerald-50">{copy.moveVisitTitle.replace("{name}", appointment.pet.name)}</h1>
            <p className="mt-1 text-sm text-emerald-800">{copy.moveLead}</p>
            <RescheduleForm
                appointmentId={appointment.id}
                petId={appointment.pet.id}
                type={appointment.type}
                species={appointment.pet.species}
                today={todayInBeirut()}
                copy={copy}
                locale={locale}
            />
        </main>
    );
}
