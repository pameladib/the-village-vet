"use client";

import type { AppointmentType, GroomingService, Pet, VisitService } from "../../../../generated/prisma/client";
import Link from "next/link";
import { ChevronLeft, SquarePen } from "lucide-react";
import { useState } from "react";
import HistoryBack from "@/components/HistoryBack";
import { ownerChat } from "@/lib/clinic/phone";
import GeneralTab from "./tabs/GeneralTab";
import AppointmentsTab from "./tabs/AppointmentsTab";
import VaccinationsTab from "./tabs/VaccinationsTab";
import MedicalTab from "./tabs/MedicalTab";
import WeightHistory, { type WeightEntry } from "./tabs/WeightHistory";
import SpeciesMark from "@/components/pets/SpeciesMark";
import type { Copy, Locale } from "@/lib/i18n";
import { petPhotoSrc } from "@/lib/storage/files";
import type { PetDocument } from "@/components/pets/DocumentList";

/* cannot use the Prisma generated Pet type because estimatedAgeValue is a Decimal while we are passing it as a normal JS number
thus we must create a new type 
Omit creates a type containing all the properties of generated Prisma type Pet except estimatedAgeValue.
then we use & to combine that type with another object type that defines the replacement property
*/
export type ProfileVaccination = {
    id: string;
    type: "FIRST" | "SECOND" | "THIRD" | "ANNUAL";
    administeredAt: Date | null;
};

export type ProfileTreatment = {
    id: string;
    type: "DEWORMING" | "FLEA_TICK";
    administeredAt: Date | null;
};

export type ProfileReminder = {
    id: string;
    kind: "VACCINATION" | "DEWORMING" | "FLEA_TREATMENT";
    dueAt: Date;
    dose: string | null;
    vaccinationId: string | null;
    treatmentId: string | null;
    status: "overdue" | "due" | "upcoming";
};

export type ProfileAppointment = {
    id: string;
    type: AppointmentType;
    services: VisitService[];
    groomingService: GroomingService | null;
    startAt: Date;
    duration: number;
    status: string;
};

export type ProfileVisit = {
    id: string;
    visitedAt: Date;
    notes: string | null;
    type: AppointmentType;
    services: VisitService[];
    linked: boolean;
};

export type PetProfileData = Omit<Pet, "estimatedAgeValue" | "medicalVisits" | "weights"> & { // keep every other property from Pet
    estimatedAgeValue: number | null; // except estimatedAgeValue which is either a number or null
    currentWeightGrams: number | null; // latest weight, in grams. Null when the pet has no weight record
    vaccinations: ProfileVaccination[];
    treatments: ProfileTreatment[];
    appointments: ProfileAppointment[];
};

export default function PetProfile({
    pet,
    visits = [],
    documents = [],
    canUpload = false,
    canRecord = false,
    reminders = [],
    weights = [],
    today = "",
    backHref = "/dashboard",
    owner,
    copy,
    locale = "en",
}: {
    pet: PetProfileData;
    visits?: ProfileVisit[];
    documents?: PetDocument[];
    canUpload?: boolean;
    canRecord?: boolean;
    reminders?: ProfileReminder[];
    weights?: WeightEntry[];
    today?: string;
    backHref?: string;
    owner?: { id: string; name: string; phone: string };
    copy: Copy;
    locale?: Locale;
}) {
    const [activeTab, setActiveTab] = useState("general");
    const ownerWhatsapp = owner ? ownerChat(owner.phone) : null;

    const tabs = [ // this array lets us define the tabs once and generate the buttons dynamically instead of writing four buttons manually
        { id: "general", label: copy.tabGeneral }, // id identifies the tab in our code, and label is the text displayed on the button
        { id: "appointments", label: copy.tabAppointments },
        { id: "vaccinations", label: copy.tabCare },
        { id: "medical", label: copy.tabMedical },
        { id: "weight", label: copy.tabWeight },
    ]

    const breed = pet.breed?.trim();
    const species = pet.species === "CAT" ? copy.speciesCat : copy.speciesDog;
    const photo = petPhotoSrc(pet.id, pet.photoUrl);

    return (
        <div className="flex flex-1 justify-center px-4 py-6 sm:px-6">
            <div className="w-full max-w-5xl">
                <header className="flex items-center justify-between gap-3">
                    <HistoryBack
                        fallback={backHref}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:border-emerald-700 hover:text-emerald-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-emerald-400 dark:hover:text-emerald-200"
                    >
                        <ChevronLeft className="size-4 rtl:rotate-180" strokeWidth={1.5} />
                        {copy.profileBack}
                    </HistoryBack>
                    <Link
                        href={`/pets/${pet.id}/edit`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:border-emerald-700 hover:text-emerald-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-emerald-400 dark:hover:text-emerald-200"
                    >
                        <SquarePen className="size-4" strokeWidth={1.5} />
                        {copy.profileEdit}
                    </Link>
                </header>

                <section className="mt-4 flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-stone-800 dark:bg-stone-900">
                    <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        {photo ? (
                            <img src={photo} alt="" className="size-full object-cover" />
                        ) : (
                            <div className="flex size-full items-center justify-center">
                                <SpeciesMark species={pet.species} className="size-10" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h1 className="truncate text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{pet.name}</h1>
                        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                            {species}
                            {breed ? ` · ${breed}` : ""}
                        </p>
                        {owner && (
                            <p className="mt-2 text-sm text-stone-500">
                                {copy.profileOwner}:{" "}
                                <Link href={`/admin/owners/${owner.id}`} className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{owner.name}</Link>
                                <span className="px-2">·</span>
                                {copy.profilePhone}:{" "}
                                {ownerWhatsapp ? (
                                    <a href={ownerWhatsapp} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{owner.phone}</a>
                                ) : owner.phone}
                            </p>
                        )}
                    </div>
                </section>

                <div className="mt-6 flex justify-start">
                    <div className="flex w-max min-w-0 max-w-full gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {tabs.map((tab) => { // rendering the tab bar
                            const selected = activeTab === tab.id; // selected is a boolean variable that checks whether the current button is the selected one. If yes, it adds a visual effect

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)} // each button sets activeTab to its id and that id decides which panel appears
                                    className={
                                        selected
                                            ? "shrink-0 cursor-pointer rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition duration-200 hover:scale-[1.03] hover:bg-emerald-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:bg-emerald-700 dark:hover:bg-emerald-600"
                                            : "shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-900 shadow-sm transition duration-200 hover:scale-[1.03] hover:border-emerald-700 hover:bg-emerald-50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50 dark:hover:border-emerald-400 dark:hover:bg-emerald-950/40"
                                    }
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="mt-3">
                    {activeTab === "general" && <GeneralTab pet={pet} copy={copy} locale={locale} />}
                    {activeTab === "appointments" && <AppointmentsTab pet={pet} visits={visits} canRecord={canRecord} copy={copy} locale={locale} />}
                    {activeTab === "vaccinations" && <VaccinationsTab pet={pet} reminders={reminders} canRecord={canRecord} copy={copy} locale={locale} />}
                    {activeTab === "medical" && <MedicalTab pet={pet} documents={documents} canUpload={canUpload} copy={copy} locale={locale} />}
                    {activeTab === "weight" && <WeightHistory petId={pet.id} today={today} weights={weights} canRecord={canRecord} copy={copy} locale={locale} />}
                </div>
            </div>
        </div>
    );
}