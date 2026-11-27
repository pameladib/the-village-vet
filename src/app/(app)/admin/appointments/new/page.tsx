import { redirect } from "next/navigation";
import NewAppointmentForm from "@/components/NewAppointmentForm";
import { todayInBeirut } from "@/lib/appointments/availability";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { activePet } from "@/lib/pets/status";
import { prisma } from "@/lib/prisma";

export default async function AdminNewAppointmentPage({ searchParams }: { searchParams: Promise<{ petId?: string; service?: string }> }) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const { petId = "", service = "" } = await searchParams;
    const locale = await getLocale();
    const copy = messages(locale);
    const pets = await prisma.pet.findMany({
        where: activePet,
        select: { id: true, name: true, species: true, owner: { select: { name: true, phoneNumber: true } } },
        orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return (
        <main className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.newAppointment}</h1>
            <NewAppointmentForm
                embedded
                staff
                pets={pets.map((pet) => ({ id: pet.id, name: pet.name, species: pet.species, ownerName: pet.owner.name, ownerPhone: pet.owner.phoneNumber }))}
                today={todayInBeirut()}
                copy={copy}
                locale={locale}
                petId={petId}
                service={service}
            />
        </main>
    );
}
