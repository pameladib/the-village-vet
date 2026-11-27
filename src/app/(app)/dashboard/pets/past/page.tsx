import PastPets from "@/components/pets/PastPets";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { petCardSelect } from "@/lib/types/pets";
import { redirect } from "next/navigation";

export default async function PastPetsPage() {
    let session;
    try {
        session = await requireRole(["OWNER"]);
    } catch (error) {
        if (error instanceof Error && error.message === "User is not authenticated") redirect("/login?next=/dashboard/pets/past");
        redirect("/dashboard");
    }

    const pets = await prisma.pet.findMany({
        where: { ownerId: session.user.id, status: "DECEASED" },
        select: petCardSelect,
        orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    const locale = await getLocale();

    return <PastPets pets={pets} copy={messages(locale)} />;
}
