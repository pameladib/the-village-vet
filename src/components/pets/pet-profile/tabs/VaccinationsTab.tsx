"use client";

import { useState } from "react";
import { TreatmentForm, VaccineForm } from "./CareRecordForm";
import type { PetProfileData, ProfileReminder } from "../PetProfile";
import { formatDateOnly, annualNumbers, doseCopyKey, historyDoseKey } from "@/lib/clinic/vaccines";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";

function givenTime(value: Date | string | null) {
    if (!value) return null;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
}

function formatGivenDate(value: Date | string | null, locale: Locale) {
    const time = givenTime(value);
    if (time == null) return null;
    return new Intl.DateTimeFormat(intlLocale(locale), {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(time));
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-800">
            <table className="w-full min-w-[18rem] text-start">
                <thead>
                    <tr className="text-sm text-stone-500">
                        {headers.map((header) => (
                            <th key={header} scope="col" className="px-3 py-2.5 text-start font-medium">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}

function EmptyRecord({ children }: { children: string }) {
    return <p className="rounded-2xl bg-stone-100 px-3 py-3 text-sm text-stone-500 dark:bg-stone-900">{children}</p>;
}

const statusTone = {
    overdue: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    due: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    upcoming: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

export default function VaccinationsTab({
    pet,
    reminders = [],
    canRecord = false,
    canAdd = canRecord,
    copy,
    locale = "en",
}: {
    pet: PetProfileData;
    reminders?: ProfileReminder[];
    canRecord?: boolean;
    canAdd?: boolean;
    copy: Copy;
    locale?: Locale;
}) {
    const [vaccineForm, setVaccineForm] = useState<"new" | string | null>(null);
    const [treatmentForm, setTreatmentForm] = useState<"new" | string | null>(null);
    const numbers = annualNumbers(pet.vaccinations);
    const vaccinations = [...pet.vaccinations].sort((left, right) => (givenTime(right.administeredAt) ?? -1) - (givenTime(left.administeredAt) ?? -1));
    const treatments = [...pet.treatments].sort((left, right) => (givenTime(right.administeredAt) ?? -1) - (givenTime(left.administeredAt) ?? -1));
    const statusLabel = { overdue: copy.overdue, due: copy.dueToday, upcoming: copy.careUpcoming };
    const dueByVaccination = new Map(reminders.filter((reminder) => reminder.vaccinationId).map((reminder) => [reminder.vaccinationId, formatDateOnly(new Date(reminder.dueAt))]));
    const dueByTreatment = new Map(reminders.filter((reminder) => reminder.treatmentId).map((reminder) => [reminder.treatmentId, formatDateOnly(new Date(reminder.dueAt))]));
    const usedPrimary = new Set(pet.vaccinations.filter((row) => row.type !== "ANNUAL").map((row) => row.type));
    const speciesDoses = pet.species === "DOG"
        ? ["FIRST", "SECOND", "THIRD", "ANNUAL"] as const
        : ["FIRST", "SECOND", "ANNUAL"] as const;

    function vaccineDoses(current?: string) {
        return speciesDoses.filter((dose) => dose === "ANNUAL" || dose === current || !usedPrimary.has(dose));
    }

    return (
        <div className="flex flex-col gap-6">
            <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{copy.vaccineHistory}</h3>
                    {canAdd && vaccineForm !== "new" && (
                        <button type="button" onClick={() => { setVaccineForm("new"); setTreatmentForm(null); }} className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950">{copy.addVaccination}</button>
                    )}
                </div>
                {canAdd && vaccineForm === "new" && (
                    <VaccineForm
                        petId={pet.id}
                        species={pet.species}
                        annualsBefore={numbers.size}
                        doses={vaccineDoses()}
                        copy={copy}
                        onClose={() => setVaccineForm(null)}
                    />
                )}
                {vaccinations.length === 0 ? <EmptyRecord>{copy.noVaccineRecords}</EmptyRecord> : (
                    <Table headers={[copy.colDose, copy.colGiven, ...(canRecord ? [""] : [])]}>
                        {vaccinations.map((row) => {
                            const date = formatGivenDate(row.administeredAt, locale);
                            return (
                                <tr key={row.id} className="border-t border-stone-200 dark:border-stone-800">
                                    <td className="px-3 py-2.5 text-sm font-medium text-stone-900 dark:text-stone-50">{copy[historyDoseKey(row.type, numbers.get(row.id) ?? null)]}</td>
                                    <td className="px-3 py-2.5 text-sm text-stone-700 dark:text-stone-200">{date ?? "—"}</td>
                                    {canRecord && (
                                        <td className="px-3 py-2.5 text-end">
                                            <button type="button" onClick={() => { setVaccineForm(row.id); setTreatmentForm(null); }} className="text-sm font-medium text-emerald-800 hover:underline dark:text-emerald-200">{copy.editRecord}</button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </Table>
                )}
                {canRecord && vaccineForm && vaccineForm !== "new" && (() => {
                    const row = vaccinations.find((item) => item.id === vaccineForm);
                    if (!row || !row.administeredAt) return null;
                    return (
                        <VaccineForm
                            petId={pet.id}
                            species={pet.species}
                            annualsBefore={Math.max(0, numbers.size - (row.type === "ANNUAL" ? 1 : 0))}
                            doses={vaccineDoses(row.type)}
                            draft={{
                                id: row.id,
                                type: row.type,
                                administeredAt: formatDateOnly(new Date(row.administeredAt)),
                                nextDueAt: dueByVaccination.get(row.id) ?? "",
                            }}
                            copy={copy}
                            onClose={() => setVaccineForm(null)}
                        />
                    );
                })()}
            </section>

            <section>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{copy.treatmentHistory}</h3>
                    {canAdd && treatmentForm !== "new" && (
                        <button type="button" onClick={() => { setTreatmentForm("new"); setVaccineForm(null); }} className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950">{copy.addTreatment}</button>
                    )}
                </div>
                {canAdd && treatmentForm === "new" && <TreatmentForm petId={pet.id} copy={copy} onClose={() => setTreatmentForm(null)} />}
                {treatments.length === 0 ? <EmptyRecord>{copy.noTreatmentRecords}</EmptyRecord> : (
                    <Table headers={[copy.colTreatment, copy.colGiven, ...(canRecord ? [""] : [])]}>
                        {treatments.map((row) => (
                            <tr key={row.id} className="border-t border-stone-200 dark:border-stone-800">
                                <td className="px-3 py-2.5 text-sm font-medium text-stone-900 dark:text-stone-50">{row.type === "DEWORMING" ? copy.doseDeworming : copy.doseFlea}</td>
                                <td className="px-3 py-2.5 text-sm text-stone-700 dark:text-stone-200">{formatGivenDate(row.administeredAt, locale) ?? "—"}</td>
                                {canRecord && (
                                    <td className="px-3 py-2.5 text-end">
                                        <button type="button" onClick={() => { setTreatmentForm(row.id); setVaccineForm(null); }} className="text-sm font-medium text-emerald-800 hover:underline dark:text-emerald-200">{copy.editRecord}</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </Table>
                )}
                {canRecord && treatmentForm && treatmentForm !== "new" && (() => {
                    const row = treatments.find((item) => item.id === treatmentForm);
                    if (!row || !row.administeredAt) return null;
                    return (
                        <TreatmentForm
                            petId={pet.id}
                            draft={{
                                id: row.id,
                                type: row.type,
                                administeredAt: formatDateOnly(new Date(row.administeredAt)),
                                nextDueAt: dueByTreatment.get(row.id) ?? "",
                            }}
                            copy={copy}
                            onClose={() => setTreatmentForm(null)}
                        />
                    );
                })()}
            </section>

            <section>
                <h3 className="mb-2 text-sm font-medium text-emerald-900 dark:text-emerald-200">{copy.upcomingCarePet}</h3>
                {reminders.length === 0 ? <EmptyRecord>{copy.noUpcomingCare}</EmptyRecord> : (
                    <Table headers={[copy.colUpcoming, copy.colDue, copy.colStatus]}>
                        {reminders.map((reminder) => {
                            const key = doseCopyKey(reminder.dose) ?? (reminder.kind === "DEWORMING" ? "doseDeworming" : reminder.kind === "FLEA_TREATMENT" ? "doseFlea" : "doseAnnual");
                            return (
                                <tr key={reminder.id} className="border-t border-stone-200 dark:border-stone-800">
                                    <td className="px-3 py-2.5 text-sm font-medium text-stone-900 dark:text-stone-50">{copy[key]}</td>
                                    <td className="px-3 py-2.5 text-sm text-stone-700 dark:text-stone-200">{formatGivenDate(reminder.dueAt, locale) ?? "—"}</td>
                                    <td className="px-3 py-2.5">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[reminder.status]}`}>{statusLabel[reminder.status]}</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </Table>
                )}
            </section>
        </div>
    );
}
