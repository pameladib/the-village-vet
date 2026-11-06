"use client";

import type { AppointmentType, Pet } from "../../../../generated/prisma/client";
import Link from "next/link";
import { ChevronLeft, SquarePen } from "lucide-react";
import { useState } from "react";
import GeneralTab from "./tabs/GeneralTab";
import AppointmentsTab from "./tabs/AppointmentsTab";
import VaccinationsTab from "./tabs/VaccinationsTab";
import MedicalTab from "./tabs/MedicalTab";
import { petPhotoSrc } from "@/lib/storage/files";

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

export type ProfileAppointment = {
    id: string;
    type: AppointmentType;
    startAt: Date;
    duration: number;
};

export type PetProfileData = Omit<Pet, "estimatedAgeValue"> & { // keep every other property from Pet
    estimatedAgeValue: number | null; // except estimatedAgeValue which is either a number or null
    currentWeightGrams: number | null; // latest weight, in grams. Null when the pet has no weight record
    vaccinations: ProfileVaccination[];
    treatments: ProfileTreatment[];
    appointments: ProfileAppointment[];
};

export default function PetProfile({ pet, documents = [], canUpload = false, canEditClinical = false }: { pet: PetProfileData; documents?: { id: string; title: string }[]; canUpload?: boolean; canEditClinical?: boolean }) {
    const [activeTab, setActiveTab] = useState("general");

    const tabs = [ // this array lets us define the tabs once and generate the buttons dynamically instead of writing four buttons manually
        { id: "general", label: "General" }, // id identifies the tab in our code, and label is the text displayed on the button
        { id: "appointments", label: "Appointments" },
        { id: "vaccinations", label: "Vaccines & treatments" },
        { id: "medical", label: "Medical" },
    ]

    const breed = pet.breed?.trim();

    return (
        <div className="flex flex-1 justify-center bg-white px-4 py-6 dark:bg-stone-950 sm:px-6">
            <div className="w-full max-w-md">
                <header className="grid grid-cols-[5.75rem_1fr_5.75rem] items-center">
                    <Link
                        href="/dashboard"
                        className="justify-self-start inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition duration-200 hover:scale-[1.03] hover:border-emerald-700 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:text-stone-200 dark:hover:border-emerald-400 dark:hover:text-emerald-200"
                    >
                        <ChevronLeft className="size-4" strokeWidth={1.5} />
                        Back
                    </Link>
                    <h1 className="text-center text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                        Profile
                    </h1>
                    <Link
                        href={`/pets/${pet.id}/edit`}
                        className="justify-self-end inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition duration-200 hover:scale-[1.03] hover:border-emerald-700 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:text-stone-200 dark:hover:border-emerald-400 dark:hover:text-emerald-200"
                    >
                        <SquarePen className="size-4" strokeWidth={1.5} />
                        Edit
                    </Link>
                </header>

                <div className="mt-8 flex flex-col items-center text-center">
                    <div className="size-32 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950">
                        {petPhotoSrc(pet.id, pet.photoUrl) ? (
                            <img src={petPhotoSrc(pet.id, pet.photoUrl) ?? ""} alt="" className="size-full object-cover" />
                        ) : (
                            <div className="flex size-full items-center justify-center text-4xl font-medium text-emerald-800 dark:text-emerald-200">
                                {pet.name.slice(0, 1)}
                            </div>
                        )}
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                        {pet.name}
                    </h2>
                    {breed && (
                        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{breed}</p>
                    )}
                </div>

                <div className="mt-6 flex justify-center">
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
                    {activeTab === "general" && <GeneralTab pet={pet} />}
                    {activeTab === "appointments" && <AppointmentsTab pet={pet} />}
                    {activeTab === "vaccinations" && <VaccinationsTab pet={pet} canEditClinical={canEditClinical} />}
                    {activeTab === "medical" && <MedicalTab pet={pet} documents={documents} canUpload={canUpload} />}
                </div>
            </div>
        </div>
    );
}