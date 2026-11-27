import HistoryBack from "@/components/HistoryBack";
import { notFound, redirect } from "next/navigation";
import VisitForm from "@/components/visits/VisitForm";
import { requireRole } from "@/lib/auth/session";
import { availableVaccineDoses } from "@/lib/clinic/vaccines";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { pageKey, refWhere } from "@/lib/slug";

export default async function NewWalkInPage({ params }: { params: Promise<{ id: string }> }) {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const { id } = await params;
    const pet = await prisma.pet.findUnique({
        where: refWhere(id),
        select: { id: true, slug: true, name: true, species: true, status: true, vaccinations: { select: { type: true, administeredAt: true } } },
    });
    if (!pet) notFound();
    if (pet.status !== "ACTIVE") redirect(`/pets/${pageKey(pet)}`);
    if (pet.slug && id !== pet.slug) redirect(`/pets/${pet.slug}/visits/new`);

    const locale = await getLocale();
    const copy = messages(locale);

    return (
        <main className="mx-auto w-full max-w-xl px-4 py-6 sm:px-6">
            <HistoryBack fallback={`/pets/${pageKey(pet)}`} className="cursor-pointer text-sm font-medium text-emerald-800">{pet.name}</HistoryBack>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.addVisit}</h1>
            <VisitForm
                copy={copy}
                mode={{
                    kind: "walkin",
                    petId: pet.id,
                    petName: pet.name,
                    care: {
                        species: pet.species,
                        doses: [...availableVaccineDoses(pet.species, pet.vaccinations)],
                        annualsBefore: pet.vaccinations.filter((row) => row.type === "ANNUAL" && row.administeredAt).length,
                    },
                }}
            />
        </main>
    );
}
