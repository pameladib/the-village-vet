import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PatientCard from "@/components/admin/PatientCard";
import PatientSearch from "@/components/admin/PatientSearch";
import Page from "@/components/Page";
import { redirect } from "next/navigation";
import { loadPatients } from "@/app/(app)/dashboard/load-staff";
import { requireRole } from "@/lib/auth/session";
import { canSeeClinicalRecords } from "@/lib/auth/permissions";
import { getLocale, messages } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { pageKey } from "@/lib/slug";

function first(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function pastHref(query: string, page: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    return search ? `/admin/patients/past?${search}` : "/admin/patients/past";
}

export default async function PastPatientsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> }) {
    let session;
    try {
        session = await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const raw = await searchParams;
    const locale = await getLocale();
    const copy = messages(locale);
    const clinical = canSeeClinicalRecords(session.user.role);
    const { query, pets, page, pages } = await loadPatients(first(raw.q) ?? "", first(raw.page), "deceased");
    const deceasedOn = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
    const count = new Intl.NumberFormat(intlLocale(locale));
    const speciesName = { CAT: copy.speciesCat, DOG: copy.speciesDog };

    return (
        <Page width="medium">
            <Link href="/admin/patients" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-900 hover:underline dark:text-emerald-200">
                <ChevronLeft className="size-4 rtl:rotate-180" />
                {copy.patients}
            </Link>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.pastPets}</h1>
            <PatientSearch query={query} path="/admin/patients/past" label={copy.search} placeholder={copy.searchHint}>
                <ul className="mt-5 grid grid-cols-1 gap-2 lg:grid-cols-2">
                    {pets.map((pet) => {
                        const breed = pet.breed?.trim();
                        const profileHref = clinical ? `/pets/${pageKey(pet)}` : `/admin/patients/${pageKey(pet)}`;
                        return (
                            <PatientCard
                                key={pet.id}
                                petHref={profileHref}
                                ownerHref={`/admin/owners/${pet.owner.id}`}
                                name={pet.name}
                                species={pet.species}
                                speciesLabel={speciesName[pet.species]}
                                breed={breed ?? ""}
                                ownerLabel={copy.columnOwner}
                                ownerName={pet.owner.name}
                                phoneLabel={copy.phone}
                                phone={pet.owner.phoneNumber}
                                note={pet.deceasedAt ? `${copy.petDeceased} · ${deceasedOn.format(pet.deceasedAt)}` : copy.petDeceased}
                            />
                        );
                    })}
                    {pets.length === 0 && <li className="text-sm text-stone-500">{query ? copy.noMatches : copy.pastPetsNone}</li>}
                </ul>
                {pages > 1 && (
                    <nav aria-label={copy.pastPets} className="mt-5 flex flex-wrap items-center justify-center gap-1">
                        <PageLink href={page > 1 ? pastHref(query, page - 1) : undefined} label={copy.patientsPrevious}>
                            <ChevronLeft className="size-4 rtl:rotate-180" />
                        </PageLink>
                        {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
                            <Link
                                key={number}
                                href={pastHref(query, number)}
                                aria-current={number === page ? "page" : undefined}
                                className={`inline-flex size-9 items-center justify-center rounded-full text-sm ${number === page ? "bg-emerald-900 text-white" : "text-emerald-950 hover:bg-emerald-50 dark:text-emerald-50 dark:hover:bg-stone-800"}`}
                            >
                                {count.format(number)}
                            </Link>
                        ))}
                        <PageLink href={page < pages ? pastHref(query, page + 1) : undefined} label={copy.patientsNext}>
                            <ChevronRight className="size-4 rtl:rotate-180" />
                        </PageLink>
                    </nav>
                )}
            </PatientSearch>
        </Page>
    );
}

function PageLink({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) {
    const className = "inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-stone-800";
    if (!href) return <span className={`${className} pointer-events-none opacity-40`}>{children}<span className="sr-only">{label}</span></span>;
    return <Link href={href} aria-label={label} className={className}>{children}<span className="sr-only">{label}</span></Link>;
}
