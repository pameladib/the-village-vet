import NewAppointmentForm from "@/components/NewAppointmentForm";
import { requireRole } from "@/lib/auth/session";
import { todayInBeirut } from "@/lib/appointments/availability";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NewAppointmentPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; petId?: string; service?: string }>;
}) {
    let session;
    try {
        session = await requireRole(["OWNER", "ADMIN", "SECONDARY_ADMIN"]);
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message === "User is not authenticated" ||
                error.message === "User does not have the required role")
        ) {
            redirect("/login?next=/appointments/new");
        }
        throw error;
    }

    const { petId = "", service = "" } = await searchParams;
    const staff = session.user.role !== "OWNER";
    if (staff) {
        const next = new URLSearchParams();
        if (petId) next.set("petId", petId);
        if (service) next.set("service", service);
        const query = next.toString();
        redirect(query ? `/admin/appointments/new?${query}` : "/admin/appointments/new");
    }

    const locale = await getLocale();
    const copy = messages(locale);
    const pets = await prisma.pet.findMany({
        where: staff ? {} : { ownerId: session.user.id },
        select: { id: true, name: true, species: true, owner: { select: { name: true } } },
        orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return (
        <NewAppointmentForm
            pets={pets.map((pet) => ({ id: pet.id, name: pet.name, species: pet.species, ownerName: staff ? pet.owner.name : undefined }))}
            today={todayInBeirut()}
            copy={copy}
            locale={locale}
            petId={petId}
            service={service}
            staff={staff}
        />
    );
}
