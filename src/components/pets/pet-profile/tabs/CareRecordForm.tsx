"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveTreatment, saveVaccination } from "@/lib/actions/care";
import { todayInBeirut } from "@/lib/appointments/availability";
import { dateOnlyUtc, formatDateOnly, nextVaccineDue, type DoseCopyKey } from "@/lib/clinic/vaccines";
import type { Copy } from "@/lib/i18n";

const fieldClassName = "w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

type VaccineDraft = {
    id?: string;
    type: "FIRST" | "SECOND" | "THIRD" | "ANNUAL";
    administeredAt: string;
    nextDueAt: string;
};

export function VaccineForm({
    petId,
    species,
    annualsBefore,
    doses,
    draft,
    copy,
    medicalVisitId,
    onClose,
}: {
    petId: string;
    species: "CAT" | "DOG";
    annualsBefore: number;
    doses: ("FIRST" | "SECOND" | "THIRD" | "ANNUAL")[];
    draft?: VaccineDraft;
    copy: Copy;
    medicalVisitId?: string;
    onClose: () => void;
}) {
    const router = useRouter();
    const [type, setType] = useState(draft?.type ?? doses[0] ?? "FIRST");
    const [administeredAt, setAdministeredAt] = useState(draft?.administeredAt ?? "");
    const [nextDueAt, setNextDueAt] = useState(draft?.nextDueAt ?? "");
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const manual = useRef(Boolean(draft?.id));
    const inputs = useRef(`${draft?.type ?? doses[0] ?? ""}|${draft?.administeredAt ?? ""}`);

    const suggestion = useMemo(() => {
        const given = dateOnlyUtc(administeredAt);
        if (!given) return "";
        const next = nextVaccineDue(species, type, given, type === "ANNUAL" ? annualsBefore : 0);
        return next ? formatDateOnly(next.dueAt) : "";
    }, [administeredAt, annualsBefore, species, type]);

    useEffect(() => {
        const key = `${type}|${administeredAt}`;
        if (inputs.current !== key) {
            inputs.current = key;
            manual.current = false;
        }
        if (!manual.current) setNextDueAt(suggestion);
    }, [administeredAt, suggestion, type]);

    const labels: Record<string, DoseCopyKey> = {
        FIRST: "doseFirst",
        SECOND: "doseSecond",
        THIRD: "doseThird",
        ANNUAL: "doseAnnual",
    };

    async function save() {
        setPending(true);
        setError(null);
        const result = await saveVaccination({ petId, recordId: draft?.id, medicalVisitId: draft?.id ? undefined : medicalVisitId, type, administeredAt, nextDueAt });
        setPending(false);
        if (!result.success) {
            setError(result.error === "duplicate" ? copy.errDoseDuplicate : result.error === "annualDate" ? copy.errDoseAnnualDate : result.error === "species" ? copy.errDoseSpecies : result.error === "due" ? copy.errDueDate : result.error === "date" ? copy.errDoseDate : copy.errCareSave);
            return;
        }
        onClose();
        router.refresh();
    }

    return (
        <form
            className="mt-3 grid gap-3 rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900"
            onSubmit={(event) => {
                event.preventDefault();
                void save();
            }}
        >
            <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm text-stone-600 dark:text-stone-300">
                    {copy.colDose}
                    <select className={`${fieldClassName} mt-1`} value={type} onChange={(event) => setType(event.target.value as VaccineDraft["type"])}>
                        {doses.map((dose) => <option key={dose} value={dose}>{copy[labels[dose]]}</option>)}
                    </select>
                </label>
                <label className="text-sm text-stone-600 dark:text-stone-300">
                    {copy.adminDate}
                    <input type="date" max={todayInBeirut()} required className={`${fieldClassName} mt-1`} value={administeredAt} onChange={(event) => setAdministeredAt(event.target.value)} />
                </label>
                <label className="text-sm text-stone-600 dark:text-stone-300">
                    {copy.nextDue}
                    <input
                        type="date"
                        className={`${fieldClassName} mt-1`}
                        value={nextDueAt}
                        onChange={(event) => {
                            manual.current = true;
                            setNextDueAt(event.target.value);
                        }}
                    />
                    <span className="mt-1 block text-xs font-normal text-stone-500">{copy.suggestNote}</span>
                </label>
            </div>
            {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={pending} className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">{copy.saveRecord}</button>
                <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">{copy.cancelRecord}</button>
            </div>
        </form>
    );
}

type TreatmentDraft = {
    id?: string;
    type: "DEWORMING" | "FLEA_TICK";
    administeredAt: string;
    nextDueAt: string;
};

export function TreatmentForm({
    petId,
    draft,
    copy,
    medicalVisitId,
    onClose,
}: {
    petId: string;
    draft?: TreatmentDraft;
    copy: Copy;
    medicalVisitId?: string;
    onClose: () => void;
}) {
    const router = useRouter();
    const [type, setType] = useState<TreatmentDraft["type"]>(draft?.type ?? "DEWORMING");
    const [administeredAt, setAdministeredAt] = useState(draft?.administeredAt ?? "");
    const [nextDueAt, setNextDueAt] = useState(draft?.nextDueAt ?? "");
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function save() {
        setPending(true);
        setError(null);
        const result = await saveTreatment({ petId, recordId: draft?.id, medicalVisitId: draft?.id ? undefined : medicalVisitId, type, administeredAt, nextDueAt });
        setPending(false);
        if (!result.success) {
            setError(result.error === "due" ? copy.errDueDate : result.error === "date" ? copy.errDoseDate : copy.errCareSave);
            return;
        }
        onClose();
        router.refresh();
    }

    return (
        <form
            className="mt-3 grid gap-3 rounded-2xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900"
            onSubmit={(event) => {
                event.preventDefault();
                void save();
            }}
        >
            <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm text-stone-600 dark:text-stone-300">
                    {copy.colTreatment}
                    <select className={`${fieldClassName} mt-1`} value={type} onChange={(event) => setType(event.target.value as TreatmentDraft["type"])}>
                        <option value="DEWORMING">{copy.doseDeworming}</option>
                        <option value="FLEA_TICK">{copy.doseFlea}</option>
                    </select>
                </label>
                <label className="text-sm text-stone-600 dark:text-stone-300">
                    {copy.adminDate}
                    <input
                        type="date"
                        max={todayInBeirut()}
                        required
                        className={`${fieldClassName} mt-1`}
                        value={administeredAt}
                        onChange={(event) => setAdministeredAt(event.target.value)}
                    />
                </label>
                <label className="text-sm text-stone-600 dark:text-stone-300">
                    {copy.nextDue}
                    <input
                        type="date"
                        className={`${fieldClassName} mt-1`}
                        value={nextDueAt}
                        onChange={(event) => setNextDueAt(event.target.value)}
                    />
                </label>
            </div>
            {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={pending} className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">{copy.saveRecord}</button>
                <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">{copy.cancelRecord}</button>
            </div>
        </form>
    );
}
