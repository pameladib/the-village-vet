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

    const { q = "", petId = "", service = "" } = await searchParams;
    const locale = await getLocale();
    const copy = messages(locale);
    const staff = session.user.role !== "OWNER";
    const pets = await prisma.pet.findMany({
        where: staff
            ? petId
                ? { id: petId }
                : q.trim().length >= 2
                    ? { name: { contains: q.trim(), mode: "insensitive" } }
                    : { id: "00000000-0000-0000-0000-000000000000" }
            : { ownerId: session.user.id },
        select: { id: true, name: true, species: true },
        orderBy: { name: "asc" },
        take: 20,
    });

    return (
        <>
            {staff && (
                <form action="/appointments/new" className="mx-auto mt-8 flex w-full max-w-lg gap-2 px-4">
                    <input name="q" defaultValue={q} placeholder={copy.bookSearchPlaceholder} className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-stone-950" />
                    <button className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white">{copy.bookFind}</button>
                </form>
            )}
            <NewAppointmentForm pets={pets} today={todayInBeirut()} emptyMessage={staff ? copy.bookSearchEmpty : undefined} copy={copy} locale={locale} petId={petId} service={service} />
        </>
    );
}
