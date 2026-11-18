"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeAppointment, createWalkIn, updateVisit } from "@/lib/actions/visits";
import { todayInBeirut } from "@/lib/appointments/availability";
import { visitServiceOrder } from "@/lib/appointments/labels";
import type { Copy } from "@/lib/i18n";
import type { VisitService } from "../../../generated/prisma/client";

const field = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

type VisitKind = "VETERINARY_VISIT" | "OPERATION";

export type WalkInPet = {
    id: string;
    name: string;
    species: "CAT" | "DOG";
    ownerName: string;
    ownerPhone: string;
};

export default function VisitForm({
    copy,
    mode,
}: {
    copy: Copy;
    mode:
        | { kind: "complete"; appointmentId: string; petName: string; when: string; detail: string }
        | { kind: "walkin"; petId?: string; petName?: string; pets?: WalkInPet[] }
        | { kind: "edit"; visitId: string; linked: boolean; date: string; visitType: VisitKind; services: VisitService[]; notes: string };
}) {
    const router = useRouter();
    const initialType: VisitKind = mode.kind === "edit" ? mode.visitType : "VETERINARY_VISIT";
    const [visitType, setVisitType] = useState<VisitKind>(initialType);
    const [services, setServices] = useState<VisitService[]>(mode.kind === "edit" ? mode.services : []);
    const [date, setDate] = useState(mode.kind === "edit" ? mode.date : todayInBeirut());
    const [notes, setNotes] = useState(mode.kind === "edit" ? mode.notes : "");
    const [petQuery, setPetQuery] = useState("");
    const [chosenPet, setChosenPet] = useState<WalkInPet | null>(null);
    const [petListOpen, setPetListOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [pending, setPending] = useState(false);
    const locked = mode.kind === "complete" || (mode.kind === "edit" && mode.linked);
    const serviceLabels: Record<VisitService, string> = {
        CHECKUP: copy.svcCheckup,
        VACCINATION: copy.svcVaccination,
        DEWORMING: copy.svcDeworming,
        FLEA_TREATMENT: copy.svcFlea,
        FOLLOW_UP: copy.svcFollowUp,
    };

    function toggle(service: VisitService) {
        setServices((current) => current.includes(service) ? current.filter((item) => item !== service) : [...current, service]);
    }

    async function save() {
        setPending(true);
        setError(null);
        setSaved(false);
        const petId = mode.kind === "walkin" ? mode.petId ?? chosenPet?.id : undefined;
        if (mode.kind === "walkin" && !petId) {
            setPending(false);
            setError(copy.visitChoosePet);
            return;
        }
        const result = mode.kind === "complete"
            ? await completeAppointment(mode.appointmentId, notes)
            : mode.kind === "walkin"
                ? await createWalkIn({ petId: petId ?? "", date, type: visitType, services, notes })
                : await updateVisit({ visitId: mode.visitId, notes, date: mode.linked ? undefined : date, type: mode.linked ? undefined : visitType, services: mode.linked ? undefined : services });
        setPending(false);
        if (!result.success) {
            if (result.error === "exists" && result.visitId && result.petId) {
                router.push(`/pets/${result.petId}/visits/${result.visitId}`);
                return;
            }
            setError(result.error === "date" ? copy.visitDateError : result.error === "denied" ? copy.outcomeError : copy.visitSaveError);
            return;
        }
        if (mode.kind === "edit") {
            setSaved(true);
            router.refresh();
            return;
        }
        router.push(`/pets/${result.petId}/visits/${result.visitId}`);
    }

    return (
        <form
            className="mt-5 flex flex-col gap-4"
            onSubmit={(event) => {
                event.preventDefault();
                void save();
            }}
        >
            {mode.kind !== "walkin" && (
                <p className="text-sm text-stone-600 dark:text-stone-300">{mode.kind === "complete" ? copy.visitCompleteLead : copy.visitNotes}</p>
            )}
            {mode.kind === "complete" && (
                <div>
                    <p className="text-sm text-stone-500">{copy.columnPet}</p>
                    <p className="mt-1 text-sm font-medium text-stone-900 dark:text-stone-50">{mode.petName}</p>
                </div>
            )}
            {mode.kind === "walkin" && mode.petId && mode.petName && (
                <div>
                    <p className="text-sm text-stone-500">{copy.columnPet}</p>
                    <p className="mt-1 text-sm font-medium text-stone-900 dark:text-stone-50">{mode.petName}</p>
                </div>
            )}
            {mode.kind === "walkin" && mode.pets && (
                <PetPicker
                    copy={copy}
                    pets={mode.pets}
                    query={petQuery}
                    open={petListOpen}
                    chosen={chosenPet}
                    onQuery={(value) => {
                        setPetQuery(value);
                        setChosenPet(null);
                        setPetListOpen(true);
                    }}
                    onOpen={setPetListOpen}
                    onChoose={(pet) => {
                        setChosenPet(pet);
                        setPetQuery(pet.name);
                        setPetListOpen(false);
                    }}
                />
            )}
            {mode.kind === "complete" ? (
                <>
                    <div>
                        <p className="text-sm text-stone-500">{copy.columnTime}</p>
                        <p className="mt-1 text-sm font-medium text-stone-900 dark:text-stone-50">{mode.when}</p>
                    </div>
                    <div>
                        <p className="text-sm text-stone-500">{copy.columnService}</p>
                        <p className="mt-1 text-sm font-medium text-stone-900 dark:text-stone-50">{mode.detail}</p>
                    </div>
                </>
            ) : locked ? null : (
                <>
                    <label className="text-sm text-stone-500">
                        {copy.visitDate}
                        <input type="date" required max={todayInBeirut()} value={date} onChange={(event) => setDate(event.target.value)} className={field} />
                    </label>
                    <label className="text-sm text-stone-500">
                        {copy.columnService}
                        <select value={visitType} onChange={(event) => setVisitType(event.target.value as VisitKind)} className={field}>
                            <option value="VETERINARY_VISIT">{copy.typeVisit}</option>
                            <option value="OPERATION">{copy.typeOperation}</option>
                        </select>
                    </label>
                    {visitType === "VETERINARY_VISIT" && (
                        <fieldset>
                            <legend className="text-sm text-stone-500">{copy.visitServices}</legend>
                            <div className="mt-2 flex flex-col gap-2">
                                {visitServiceOrder.map((service) => (
                                    <label key={service} className="flex items-center gap-2 text-sm text-stone-800 dark:text-stone-100">
                                        <input type="checkbox" checked={services.includes(service)} onChange={() => toggle(service)} />
                                        {serviceLabels[service]}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    )}
                </>
            )}
            {mode.kind === "edit" && locked && (
                <p className="text-sm text-stone-500">{copy.columnTime}: <span className="font-medium text-stone-900 dark:text-stone-50">{mode.date}</span></p>
            )}
            <label className="text-sm text-stone-500">
                {copy.visitNotes}
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} maxLength={4000} placeholder={copy.visitNotesPh} className={field} />
            </label>
            {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
            {saved && <p className="text-sm text-emerald-800 dark:text-emerald-200">{copy.visitSaved}</p>}
            <button type="submit" disabled={pending} className="w-fit rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                {pending ? copy.visitSaving : copy.visitSave}
            </button>
        </form>
    );
}

function PetPicker({
    copy,
    pets,
    query,
    open,
    chosen,
    onQuery,
    onOpen,
    onChoose,
}: {
    copy: Copy;
    pets: WalkInPet[];
    query: string;
    open: boolean;
    chosen: WalkInPet | null;
    onQuery: (value: string) => void;
    onOpen: (open: boolean) => void;
    onChoose: (pet: WalkInPet) => void;
}) {
    const needle = query.trim().toLowerCase();
    const needleDigits = query.replace(/\D/g, "");
    const matches = pets.filter((pet) => {
        if (chosen && pet.id === chosen.id) return false;
        if (!needle) return true;
        if (pet.name.toLowerCase().includes(needle) || pet.ownerName.toLowerCase().includes(needle)) return true;
        return needleDigits.length > 0 && pet.ownerPhone.replace(/\D/g, "").includes(needleDigits);
    });

    return (
        <div className="relative">
            <label className="text-sm text-stone-500">
                {copy.columnPet}
                <input
                    value={query}
                    onChange={(event) => onQuery(event.target.value)}
                    onFocus={() => onOpen(true)}
                    onBlur={() => onOpen(false)}
                    placeholder={copy.searchHint}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="walk-in-pets"
                    className={field}
                />
            </label>
            {open && (
                <ul id="walk-in-pets" className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
                    {matches.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-stone-500">{copy.visitNoPetMatch}</li>
                    ) : matches.map((pet) => (
                        <li key={pet.id}>
                            <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => onChoose(pet)}
                                className="flex w-full flex-col px-3 py-2 text-start hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                                <span className="text-sm font-medium text-stone-900 dark:text-stone-50">{pet.name}</span>
                                <span className="text-sm text-stone-500">{pet.species === "CAT" ? copy.speciesCat : copy.speciesDog} · {pet.ownerName} · {pet.ownerPhone}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
