import { redirect } from "next/navigation";
import VisitForm from "@/components/visits/VisitForm";
import { requireRole } from "@/lib/auth/session";
import { availableVaccineDoses } from "@/lib/clinic/vaccines";
import { getLocale, messages } from "@/lib/i18n";
import { activePet } from "@/lib/pets/status";
import { prisma } from "@/lib/prisma";

export default async function NewDashboardVisitPage() {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const pets = await prisma.pet.findMany({
        where: activePet,
        select: {
            id: true,
            name: true,
            species: true,
            owner: { select: { name: true, phoneNumber: true } },
            vaccinations: { select: { type: true, administeredAt: true } },
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    const locale = await getLocale();
    const copy = messages(locale);

    return (
        <main className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.addVisit}</h1>
            <VisitForm
                copy={copy}
                mode={{
                    kind: "walkin",
                    pets: pets.map((pet) => ({
                        id: pet.id,
                        name: pet.name,
                        species: pet.species,
                        ownerName: pet.owner.name,
                        ownerPhone: pet.owner.phoneNumber,
                        doses: [...availableVaccineDoses(pet.species, pet.vaccinations)],
                        annualsBefore: pet.vaccinations.filter((row) => row.type === "ANNUAL" && row.administeredAt).length,
                    })),
                }}
            />
        </main>
    );
}
