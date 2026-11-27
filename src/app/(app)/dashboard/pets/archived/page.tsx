import ArchivedPets from "@/components/pets/ArchivedPets";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { petCardSelect } from "@/lib/types/pets";
import { redirect } from "next/navigation";

export default async function ArchivedPetsPage() {
    let session;
    try {
        session = await requireRole(["OWNER"]);
    } catch (error) {
        if (error instanceof Error && error.message === "User is not authenticated") redirect("/login?next=/dashboard/pets/archived");
        redirect("/dashboard");
    }

    const pets = await prisma.pet.findMany({
        where: { ownerId: session.user.id, status: "ARCHIVED" },
        select: petCardSelect,
        orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    const locale = await getLocale();

    return <ArchivedPets pets={pets} copy={messages(locale)} />;
}
