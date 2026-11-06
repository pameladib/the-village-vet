import { CirclePlus, ClipboardList, History, Pill, TriangleAlert, Utensils } from "lucide-react";
import DocumentList from "@/components/pets/DocumentList";
import type { PetProfileData } from "../PetProfile";

function formatCalendarDate(date: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function formatSpayed(pet: PetProfileData) {
    if (pet.spayedNeutered === "YES") {
        return pet.spayedNeuteredAt ? `Yes · ${formatCalendarDate(pet.spayedNeuteredAt)}` : "Yes";
    }
    if (pet.spayedNeutered === "NO") return "No";
    if (pet.spayedNeutered === "UNKNOWN") return "Unknown";
    return null;
}

function note(value: string | null) {
    const text = value?.trim();
    return text ? text : null;
}

export default function MedicalTab({
    pet,
    documents,
    canUpload,
}: {
    pet: PetProfileData;
    documents: { id: string; title: string }[];
    canUpload: boolean;
}) {
    const cards = [
        { label: "Spayed/Neutered", value: formatSpayed(pet), icon: <CirclePlus className="size-4" strokeWidth={1.75} /> },
        { label: "Allergies", value: note(pet.allergies), icon: <TriangleAlert className="size-4" strokeWidth={1.75} /> },
        { label: "Medical conditions", value: note(pet.medicalConditions), icon: <ClipboardList className="size-4" strokeWidth={1.75} /> },
        { label: "Medications", value: note(pet.medications), icon: <Pill className="size-4" strokeWidth={1.75} /> },
        { label: "Diet", value: note(pet.diet), icon: <Utensils className="size-4" strokeWidth={1.75} /> },
        { label: "Previous history", value: note(pet.previousHistory), icon: <History className="size-4" strokeWidth={1.75} /> },
    ];

    return (
        <div className="flex flex-col gap-3">
            {cards.map((card) => (
                <div key={card.label} className="rounded-2xl bg-stone-100 px-3.5 py-3.5 dark:bg-stone-900">
                    <div className="flex items-center gap-2">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-200/80 text-emerald-800 dark:bg-stone-800 dark:text-emerald-200">
                            {card.icon}
                        </span>
                        <span className="text-sm font-medium leading-tight text-stone-600 dark:text-stone-300">{card.label}</span>
                    </div>
                    <p className={card.value ? "mt-4 whitespace-pre-wrap text-base font-medium leading-6 text-stone-900 dark:text-stone-50" : "mt-4 text-base font-medium leading-6 text-stone-400 dark:text-stone-500"}>
                        {card.value ?? "Not provided"}
                    </p>
                </div>
            ))}
            <DocumentList petId={pet.id} documents={documents} canUpload={canUpload} />
        </div>
    );
}

