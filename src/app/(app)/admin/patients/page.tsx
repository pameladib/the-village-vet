import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PatientCard from "@/components/admin/PatientCard";
import PatientSearch from "@/components/admin/PatientSearch";
import Page from "@/components/Page";
import { redirect } from "next/navigation";
import { loadPatients, type PatientTab } from "@/app/(app)/dashboard/load-staff";
import { requireRole } from "@/lib/auth/session";
import { canSeeClinicalRecords } from "@/lib/auth/permissions";
import { getLocale, messages } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { pageKey } from "@/lib/slug";

function first(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

const tabs = ["active", "archived"] as const satisfies readonly PatientTab[];

function patientsHref(query: string, page: number, tab: PatientTab) {
    const params = new URLSearchParams();
    if (tab !== "active") params.set("tab", tab);
    if (query) params.set("q", query);
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    return search ? `/admin/patients?${search}` : "/admin/patients";
}

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; page?: string | string[]; tab?: string | string[] }> }) {
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
    const requestedTab = first(raw.tab);
    if (requestedTab === "deceased") {
        const params = new URLSearchParams();
        const q = (first(raw.q) ?? "").trim();
        const requestedPage = first(raw.page);
        if (q) params.set("q", q);
        if (requestedPage && requestedPage !== "1") params.set("page", requestedPage);
        const search = params.toString();
        redirect(search ? `/admin/patients/past?${search}` : "/admin/patients/past");
    }
    const tab: PatientTab = requestedTab === "archived" ? "archived" : "active";
    const { query, pets, page, pages, counts, hasPastPets } = await loadPatients(first(raw.q) ?? "", first(raw.page), tab);
    const tabLabel = { active: copy.patientsActive, archived: copy.patientsArchived, deceased: copy.patientsDeceased };
    const empty = { active: copy.patientsActiveEmpty, archived: copy.patientsArchivedEmpty, deceased: copy.patientsDeceasedEmpty };
    const deceasedOn = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
    const count = new Intl.NumberFormat(intlLocale(locale));
    const speciesName = { CAT: copy.speciesCat, DOG: copy.speciesDog };

    return (
        <Page width="medium">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.patients}</h1>
                {hasPastPets && (
                    <Link href="/admin/patients/past" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-900 hover:underline dark:text-emerald-200">
                        {copy.viewPastPets}
                        <ChevronRight className="size-4 rtl:rotate-180" />
                    </Link>
                )}
            </div>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{copy.patientsLead}</p>
            <div role="tablist" aria-label={copy.patients} className="mt-6 flex w-max min-w-0 max-w-full gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {tabs.map((id) => {
                    const selected = tab === id;
                    return (
                        <Link
                            key={id}
                            href={patientsHref(query, 1, id)}
                            role="tab"
                            aria-selected={selected}
                            className={selected
                                ? "inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white shadow-sm dark:bg-emerald-700"
                                : "inline-flex shrink-0 items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-900 shadow-sm hover:border-emerald-700 hover:bg-emerald-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50 dark:hover:border-emerald-400 dark:hover:bg-emerald-950/40"}
                        >
                            {tabLabel[id]}
                            <span className={selected ? "rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold" : "rounded-full bg-stone-100 px-1.5 py-0.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300"}>
                                {count.format(counts[id])}
                            </span>
                        </Link>
                    );
                })}
            </div>
            <PatientSearch query={query} tab={tab} label={copy.search} placeholder={copy.searchHint}>
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
                                note={pet.status === "DECEASED" ? (pet.deceasedAt ? `${copy.petDeceased} · ${deceasedOn.format(pet.deceasedAt)}` : copy.petDeceased) : pet.status === "ARCHIVED" ? copy.petArchived : undefined}
                            />
                        );
                    })}
                    {pets.length === 0 && <li className="text-sm text-stone-500">{query ? copy.noMatches : empty[tab]}</li>}
                </ul>
                {pages > 1 && (
                    <nav aria-label={copy.patients} className="mt-5 flex flex-wrap items-center justify-center gap-1">
                        <PageLink href={page > 1 ? patientsHref(query, page - 1, tab) : undefined} label={copy.patientsPrevious}>
                            <ChevronLeft className="size-4 rtl:rotate-180" />
                        </PageLink>
                        {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
                            <Link
                                key={number}
                                href={patientsHref(query, number, tab)}
                                aria-current={number === page ? "page" : undefined}
                                className={`inline-flex size-9 items-center justify-center rounded-full text-sm ${number === page ? "bg-emerald-900 text-white" : "text-emerald-950 hover:bg-emerald-50 dark:text-emerald-50 dark:hover:bg-stone-800"}`}
                            >
                                {count.format(number)}
                            </Link>
                        ))}
                        <PageLink href={page < pages ? patientsHref(query, page + 1, tab) : undefined} label={copy.patientsNext}>
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
