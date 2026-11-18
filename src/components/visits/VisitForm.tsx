"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeAppointment, createWalkIn, updateVisit } from "@/lib/actions/visits";
import { todayInBeirut } from "@/lib/appointments/availability";
import { visitServiceOrder } from "@/lib/appointments/labels";
import { dateOnlyUtc, formatDateOnly, nextVaccineDue, type DoseCopyKey } from "@/lib/clinic/vaccines";
import type { Copy } from "@/lib/i18n";
import type { VisitService } from "../../../generated/prisma/client";

const field = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

type VisitKind = "VETERINARY_VISIT" | "OPERATION";

type Dose = "FIRST" | "SECOND" | "THIRD" | "ANNUAL";
type TreatmentKind = "DEWORMING" | "FLEA_TICK";

export type PetCare = {
    species: "CAT" | "DOG";
    doses: Dose[];
    annualsBefore: number;
};

export type WalkInPet = {
    id: string;
    name: string;
    species: "CAT" | "DOG";
    ownerName: string;
    ownerPhone: string;
    doses: Dose[];
    annualsBefore: number;
};

type VaccineDraft = { type: Dose; administeredAt: string; nextDueAt: string };
type TreatmentDraft = { type: TreatmentKind; administeredAt: string; nextDueAt: string };

export default function VisitForm({
    copy,
    mode,
}: {
    copy: Copy;
    mode:
        | { kind: "complete"; appointmentId: string; petName: string; when: string; detail: string; visitDay: string; care: PetCare }
        | { kind: "walkin"; petId?: string; petName?: string; pets?: WalkInPet[]; care?: PetCare }
        | { kind: "edit"; visitId: string; linked: boolean; date: string; visitType: VisitKind; services: VisitService[]; notes: string };
}) {
    const router = useRouter();
    const initialType: VisitKind = mode.kind === "edit" ? mode.visitType : "VETERINARY_VISIT";
    const [visitType, setVisitType] = useState<VisitKind>(initialType);
    const [services, setServices] = useState<VisitService[]>(mode.kind === "edit" ? mode.services : []);
    const [date, setDate] = useState(mode.kind === "edit" ? mode.date : todayInBeirut());
    const [notes, setNotes] = useState(mode.kind === "edit" ? mode.notes : "");
    const [remind, setRemind] = useState(false);
    const [followDate, setFollowDate] = useState("");
    const [followNotes, setFollowNotes] = useState("");
    const [petQuery, setPetQuery] = useState("");
    const [chosenPet, setChosenPet] = useState<WalkInPet | null>(null);
    const [petListOpen, setPetListOpen] = useState(false);
    const [vaccineOpen, setVaccineOpen] = useState(false);
    const [treatmentOpen, setTreatmentOpen] = useState(false);
    const [vaccineType, setVaccineType] = useState<Dose | "">("");
    const [vaccineDue, setVaccineDue] = useState<{ key: string; value: string } | null>(null);
    const [treatmentType, setTreatmentType] = useState<TreatmentKind>("DEWORMING");
    const [treatmentDue, setTreatmentDue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [pending, setPending] = useState(false);
    const locked = mode.kind === "complete" || (mode.kind === "edit" && mode.linked);
    const care = mode.kind === "complete"
        ? mode.care
        : mode.kind === "walkin"
            ? mode.care ?? (chosenPet ? { species: chosenPet.species, doses: chosenPet.doses, annualsBefore: chosenPet.annualsBefore } : null)
            : null;
    const visitDay = mode.kind === "complete" ? mode.visitDay : date;
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
        if (mode.kind !== "edit" && remind && !followDate) {
            setPending(false);
            setError(copy.followUpDateError);
            return;
        }
        const followUp = mode.kind !== "edit" && remind ? { date: followDate, notes: followNotes } : null;
        const vaccination = mode.kind === "edit" ? null : vaccineDraft(vaccineOpen, care, visitDay, vaccineType, vaccineDue);
        const treatment = mode.kind === "edit" ? null : treatmentDraft(treatmentOpen, care, visitDay, treatmentType, treatmentDue);
        const result = mode.kind === "complete"
            ? await completeAppointment(mode.appointmentId, notes, followUp, { vaccination, treatment })
            : mode.kind === "walkin"
                ? await createWalkIn({ petId: petId ?? "", date, type: visitType, services, notes, followUp, vaccination, treatment })
                : await updateVisit({ visitId: mode.visitId, notes, date: mode.linked ? undefined : date, type: mode.linked ? undefined : visitType, services: mode.linked ? undefined : services });
        setPending(false);
        if (!result.success) {
            if (result.error === "exists" && result.visitId && result.petId) {
                router.push(`/pets/${result.petId}/visits/${result.visitId}`);
                return;
            }
            setError(saveError(copy, result.error));
            return;
        }
        if (mode.kind === "edit") {
            setSaved(true);
            router.refresh();
            return;
        }
        router.push("/dashboard?visit=saved");
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
            {mode.kind !== "edit" && (
                <VisitCareFields
                    copy={copy}
                    visitDay={visitDay}
                    care={care}
                    vaccineOpen={vaccineOpen}
                    treatmentOpen={treatmentOpen}
                    vaccineType={vaccineType}
                    vaccineDue={vaccineDue}
                    treatmentType={treatmentType}
                    treatmentDue={treatmentDue}
                    onVaccineOpen={setVaccineOpen}
                    onTreatmentOpen={setTreatmentOpen}
                    onVaccineType={setVaccineType}
                    onVaccineDue={setVaccineDue}
                    onTreatmentType={setTreatmentType}
                    onTreatmentDue={setTreatmentDue}
                />
            )}
            {mode.kind !== "edit" && (
                <fieldset className="rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
                    <label className="flex items-center gap-2 text-sm font-medium text-stone-800 dark:text-stone-100">
                        <input type="checkbox" checked={remind} onChange={(event) => setRemind(event.target.checked)} />
                        {copy.followUpAdd}
                    </label>
                    {remind && (
                        <div className="mt-3 flex flex-col gap-3">
                            <label className="text-sm text-stone-500">
                                {copy.followUpDate}
                                <input type="date" required value={followDate} onChange={(event) => setFollowDate(event.target.value)} className={field} />
                            </label>
                            <label className="text-sm text-stone-500">
                                {copy.followUpNotes}
                                <textarea value={followNotes} onChange={(event) => setFollowNotes(event.target.value)} rows={3} maxLength={1000} placeholder={copy.followUpNotesPh} className={field} />
                            </label>
                        </div>
                    )}
                </fieldset>
            )}
            {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
            {saved && <p className="text-sm text-emerald-800 dark:text-emerald-200">{copy.visitSaved}</p>}
            <button type="submit" disabled={pending} className="w-fit rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                {pending ? copy.visitSaving : copy.visitSave}
            </button>
        </form>
    );
}

const doseLabels: Record<Dose, DoseCopyKey> = {
    FIRST: "doseFirst",
    SECOND: "doseSecond",
    THIRD: "doseThird",
    ANNUAL: "doseAnnual",
};

const careButton = "rounded-full px-3 py-1.5 text-sm font-medium";
const careSolid = `${careButton} bg-emerald-900 text-white hover:bg-emerald-950`;
const careQuiet = `${careButton} border border-emerald-900 text-emerald-900 hover:bg-emerald-50 dark:border-emerald-300 dark:text-emerald-100 dark:hover:bg-emerald-950`;
const careOpen = `${careButton} border border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-100`;

function saveError(copy: Copy, code: string | undefined) {
    if (!code) return copy.visitSaveError;
    if (code === "date") return copy.visitDateError;
    if (code === "followUp") return copy.followUpDateError;
    if (code === "denied") return copy.outcomeError;
    if (code === "duplicate") return copy.errDoseDuplicate;
    if (code === "species") return copy.errDoseSpecies;
    if (code === "due") return copy.errDueDate;
    if (code === "doseDate") return copy.errDoseDate;
    return copy.visitSaveError;
}

function vaccineDraft(open: boolean, care: PetCare | null, visitDay: string, type: Dose | "", dueState: { key: string; value: string } | null): VaccineDraft | null {
    if (!open || !care) return null;
    const selected = care.doses.find((dose) => dose === type) ?? care.doses[0];
    if (!selected) return null;
    const given = dateOnlyUtc(visitDay);
    const suggested = given ? nextVaccineDue(care.species, selected, given, selected === "ANNUAL" ? care.annualsBefore : 0) : null;
    const track = `${selected}|${visitDay}`;
    const nextDue = dueState?.key === track ? dueState.value : (suggested ? formatDateOnly(suggested.dueAt) : "");
    return { type: selected, administeredAt: visitDay, nextDueAt: nextDue };
}

function treatmentDraft(open: boolean, care: PetCare | null, visitDay: string, type: TreatmentKind, nextDueAt: string): TreatmentDraft | null {
    if (!open || !care) return null;
    return { type, administeredAt: visitDay, nextDueAt };
}

function VisitCareFields({
    copy,
    visitDay,
    care,
    vaccineOpen,
    treatmentOpen,
    vaccineType,
    vaccineDue,
    treatmentType,
    treatmentDue,
    onVaccineOpen,
    onTreatmentOpen,
    onVaccineType,
    onVaccineDue,
    onTreatmentType,
    onTreatmentDue,
}: {
    copy: Copy;
    visitDay: string;
    care: PetCare | null;
    vaccineOpen: boolean;
    treatmentOpen: boolean;
    vaccineType: Dose | "";
    vaccineDue: { key: string; value: string } | null;
    treatmentType: TreatmentKind;
    treatmentDue: string;
    onVaccineOpen: (open: boolean) => void;
    onTreatmentOpen: (open: boolean) => void;
    onVaccineType: (type: Dose) => void;
    onVaccineDue: (due: { key: string; value: string }) => void;
    onTreatmentType: (type: TreatmentKind) => void;
    onTreatmentDue: (due: string) => void;
}) {
    const doses = care?.doses ?? [];
    const selected = doses.find((dose) => dose === vaccineType) ?? doses[0] ?? "ANNUAL";
    const track = `${selected}|${visitDay}`;
    const draft = vaccineDraft(true, care, visitDay, vaccineType, vaccineDue);
    const nextDue = draft?.nextDueAt ?? "";

    return (
        <div className="flex flex-col gap-4">
            <section className="rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
                <button type="button" aria-expanded={vaccineOpen} onClick={() => onVaccineOpen(!vaccineOpen)} className={vaccineOpen ? careOpen : careSolid}>
                    {copy.addVaccination}
                </button>
                {vaccineOpen && (
                    care && doses.length > 0 ? (
                        <div className="mt-3 flex flex-col gap-3">
                            <label className="text-sm text-stone-500">
                                {copy.colDose}
                                <select value={selected} onChange={(event) => onVaccineType(event.target.value as Dose)} className={field}>
                                    {doses.map((dose) => <option key={dose} value={dose}>{copy[doseLabels[dose]]}</option>)}
                                </select>
                            </label>
                            <label className="text-sm text-stone-500">
                                {copy.adminDate}
                                <input type="date" readOnly required value={visitDay} className={field} />
                            </label>
                            <label className="text-sm text-stone-500">
                                {copy.nextDue}
                                <input
                                    type="date"
                                    value={nextDue}
                                    onChange={(event) => onVaccineDue({ key: track, value: event.target.value })}
                                    className={field}
                                />
                                <span className="mt-1 block text-xs font-normal text-stone-500">{copy.suggestNote}</span>
                            </label>
                        </div>
                    ) : (
                        <p className="mt-3 text-sm text-stone-500">{care ? copy.errDoseSpecies : copy.visitChoosePet}</p>
                    )
                )}
            </section>
            <section className="rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
                <button type="button" aria-expanded={treatmentOpen} onClick={() => onTreatmentOpen(!treatmentOpen)} className={treatmentOpen ? careOpen : careQuiet}>
                    {copy.addTreatment}
                </button>
                {treatmentOpen && (
                    care ? (
                        <div className="mt-3 flex flex-col gap-3">
                            <label className="text-sm text-stone-500">
                                {copy.colTreatment}
                                <select value={treatmentType} onChange={(event) => onTreatmentType(event.target.value as TreatmentKind)} className={field}>
                                    <option value="DEWORMING">{copy.doseDeworming}</option>
                                    <option value="FLEA_TICK">{copy.doseFlea}</option>
                                </select>
                            </label>
                            <label className="text-sm text-stone-500">
                                {copy.adminDate}
                                <input type="date" readOnly required value={visitDay} className={field} />
                            </label>
                            <label className="text-sm text-stone-500">
                                {copy.nextDue}
                                <input type="date" value={treatmentDue} onChange={(event) => onTreatmentDue(event.target.value)} className={field} />
                            </label>
                        </div>
                    ) : (
                        <p className="mt-3 text-sm text-stone-500">{copy.visitChoosePet}</p>
                    )
                )}
            </section>
        </div>
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
