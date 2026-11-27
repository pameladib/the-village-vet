import Link from "next/link";
import HistoryBack from "@/components/HistoryBack";
import { ChevronLeft } from "lucide-react";
import SpeciesMark from "@/components/pets/SpeciesMark";
import { notFound, redirect } from "next/navigation";
import { appointmentDetail } from "@/lib/appointments/labels";
import { requireRole } from "@/lib/auth/session";
import { canSeeClinicalRecords } from "@/lib/auth/permissions";
import { getLocale, messages, type Copy, type Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { ownerChat } from "@/lib/clinic/phone";
import { prisma } from "@/lib/prisma";
import { pageKey, refWhere } from "@/lib/slug";

function ageText(
    pet: {
        dateOfBirth: Date | null;
        estimatedAgeValue: { toNumber(): number } | null;
        estimatedAgeUnit: "DAYS" | "WEEKS" | "MONTHS" | "YEARS" | null;
    },
    copy: Copy,
    locale: Locale,
) {
    const amount = new Intl.NumberFormat(intlLocale(locale));
    const units = { DAYS: copy.ageDays, WEEKS: copy.ageWeeks, MONTHS: copy.ageMonths, YEARS: copy.ageYears };
    if (pet.dateOfBirth) {
        const birthYear = pet.dateOfBirth.getUTCFullYear();
        const birthMonth = pet.dateOfBirth.getUTCMonth();
        const birthDay = pet.dateOfBirth.getUTCDate();
        const today = new Date();
        let years = today.getUTCFullYear() - birthYear;
        const birthdayPassed = today.getUTCMonth() > birthMonth || (today.getUTCMonth() === birthMonth && today.getUTCDate() >= birthDay);
        if (!birthdayPassed) years -= 1;
        if (years >= 1) return `${amount.format(years)} ${copy.ageYears}`;

        let months = (today.getUTCFullYear() - birthYear) * 12 + (today.getUTCMonth() - birthMonth);
        if (today.getUTCDate() < birthDay) months -= 1;
        if (months >= 1) return `${amount.format(months)} ${copy.ageMonths}`;

        const days = Math.max(0, Math.round((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - Date.UTC(birthYear, birthMonth, birthDay)) / 86_400_000));
        return `${amount.format(days)} ${copy.ageDays}`;
    }
    if (pet.estimatedAgeValue != null && pet.estimatedAgeUnit) {
        return `${amount.format(pet.estimatedAgeValue.toNumber())} ${units[pet.estimatedAgeUnit]}`;
    }
    return null;
}

export default async function PatientSummaryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let session;
    try {
        session = await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }
    const pet = await prisma.pet.findUnique({
        where: refWhere(id),
        select: {
            id: true,
            slug: true,
            name: true,
            species: true,
            breed: true,
            sex: true,
            color: true,
            lifestyle: true,
            status: true,
            deceasedAt: true,
            dateOfBirth: true,
            estimatedAgeValue: true,
            estimatedAgeUnit: true,
            owner: { select: { id: true, name: true, phoneNumber: true } },
            appointments: {
                where: { status: { in: ["BOOKED", "COMPLETED"] } },
                orderBy: { startAt: "desc" },
                select: { id: true, type: true, services: true, groomingService: true, startAt: true, status: true },
            },
        },
    });
    if (!pet) notFound();
    if (canSeeClinicalRecords(session.user.role)) redirect(`/pets/${pageKey(pet)}`);
    if (pet.slug && id !== pet.slug) redirect(`/admin/patients/${pet.slug}`);

    const locale = await getLocale();
    const copy = messages(locale);
    const when = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Beirut" });
    const born = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeZone: "UTC" });
    const now = Date.now();
    const upcoming = pet.appointments.filter((visit) => visit.status === "BOOKED" && visit.startAt.getTime() >= now).sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
    const previous = pet.appointments.filter((visit) => visit.status === "COMPLETED");
    const breed = pet.breed?.trim();
    const age = ageText(pet, copy, locale);
    const lifestyle = pet.lifestyle === "INDOOR" ? copy.lifestyleIndoor : pet.lifestyle === "OUTDOOR" ? copy.lifestyleOutdoor : pet.lifestyle === "HYBRID" ? copy.lifestyleHybrid : copy.notProvided;
    const ownerWhatsapp = ownerChat(pet.owner.phoneNumber);

    return (
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            <HistoryBack fallback="/admin/patients" className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-emerald-900 hover:underline dark:text-emerald-200">
                <ChevronLeft className="size-4 rtl:rotate-180" />
                {copy.patients}
            </HistoryBack>
            <div className="mt-4 flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    <SpeciesMark species={pet.species} className="size-6" />
                </span>
                <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{pet.name}</h1>
                    <p className="text-sm text-stone-600 dark:text-stone-300">
                        {pet.species === "CAT" ? copy.speciesCat : copy.speciesDog}
                        {breed ? ` · ${breed}` : ""}
                    </p>
                    {pet.status === "ARCHIVED" && <p className="text-sm text-stone-500">{copy.petArchivedNote}</p>}
                    {pet.status === "DECEASED" && (
                        <p className="text-sm text-stone-500">
                            {copy.petDeceased}
                            {pet.deceasedAt ? ` · ${born.format(pet.deceasedAt)}` : ""}
                        </p>
                    )}
                </div>
            </div>
            <p className="mt-3 text-sm text-stone-500">{copy.patientLimited}</p>

            <section className="mt-5 rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.petDetails}</h2>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <Fact label={copy.breed} value={breed || copy.notProvided} />
                    <Fact label={copy.sex} value={pet.sex === "MALE" ? copy.sexMale : copy.sexFemale} />
                    <Fact label={copy.dateOfBirth} value={pet.dateOfBirth ? born.format(pet.dateOfBirth) : copy.notProvided} />
                    <Fact label={copy.age} value={age ?? copy.notProvided} />
                    <Fact label={copy.color} value={pet.color?.trim() || copy.notProvided} />
                    <Fact label={copy.lifestyle} value={lifestyle} />
                </dl>
            </section>

            <section className="mt-3 rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.columnOwner}</h2>
                <p className="mt-2 text-sm text-stone-800 dark:text-stone-100">
                    <Link href={`/admin/owners/${pet.owner.id}`} className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{pet.owner.name}</Link>
                </p>
                <p className="text-sm text-stone-500">
                    {copy.phone}:{" "}
                    {ownerWhatsapp ? (
                        <a href={ownerWhatsapp} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{pet.owner.phoneNumber}</a>
                    ) : pet.owner.phoneNumber}
                </p>
                {pet.status === "ACTIVE" && (
                    <Link href={`/admin/appointments/new?petId=${pet.id}`} className="mt-3 inline-flex rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950">{copy.book}</Link>
                )}
            </section>

            <AppointmentGroup title={copy.patientUpcoming} empty={copy.patientNoneUpcoming} visits={upcoming} when={when} copy={copy} />
            <AppointmentGroup title={copy.patientPrevious} empty={copy.patientNonePrevious} visits={previous} when={when} copy={copy} />
        </main>
    );
}

function Fact({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-stone-500">{label}</dt>
            <dd className="font-medium text-stone-900 dark:text-stone-50">{value}</dd>
        </div>
    );
}

function AppointmentGroup({
    title,
    empty,
    visits,
    when,
    copy,
}: {
    title: string;
    empty: string;
    visits: {
        id: string;
        type: Parameters<typeof appointmentDetail>[0];
        services: Parameters<typeof appointmentDetail>[1];
        groomingService: Parameters<typeof appointmentDetail>[2];
        startAt: Date;
    }[];
    when: Intl.DateTimeFormat;
    copy: Copy;
}) {
    return (
        <section className="mt-3 rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
            <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{title}</h2>
            {visits.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">{empty}</p>
            ) : (
                <ul className="mt-2 flex flex-col gap-2">
                    {visits.map((visit) => (
                        <li key={visit.id} className="text-sm">
                            <Link href={`/admin/appointments/${visit.id}`} className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">
                                {appointmentDetail(visit.type, visit.services, visit.groomingService, copy)}
                            </Link>
                            <p className="text-stone-500">{when.format(visit.startAt)}</p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
