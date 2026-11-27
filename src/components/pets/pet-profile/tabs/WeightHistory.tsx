"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPetWeight, deletePetWeight, updatePetWeight } from "@/lib/actions/weights";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { formatHistoryWeight } from "@/lib/pets/weight";

export type WeightEntry = {
    id: string;
    weight: string;
    date: string;
    notes: string | null;
    linked: boolean;
};

const field = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";
const solid = "rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60";
const quiet = "rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-emerald-700 dark:border-stone-600 dark:text-stone-200";

function writtenDate(value: string, locale: Locale) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function shownWeight(stored: string, copy: Copy) {
    const shown = formatHistoryWeight(stored);
    return `${shown.amount} ${shown.unit === "g" ? copy.unitG : copy.unitKg}`;
}

function message(copy: Copy, code: string) {
    if (code === "date") return copy.weightDateErr;
    if (code === "notes") return copy.weightNotesLong;
    if (code === "visitDate") return copy.weightVisitDate;
    if (code === "missing") return copy.weightMissing;
    if (code === "denied") return copy.outcomeError;
    return copy.weightErr;
}

export default function WeightHistory({
    petId,
    today,
    weights,
    canRecord,
    canAdd = canRecord,
    copy,
    locale,
}: {
    petId: string;
    today: string;
    weights: WeightEntry[];
    canRecord: boolean;
    canAdd?: boolean;
    copy: Copy;
    locale: Locale;
}) {
    const router = useRouter();
    const [form, setForm] = useState<"new" | string | null>(null);
    const [weight, setWeight] = useState("");
    const [date, setDate] = useState(today);
    const [notes, setNotes] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const editing = weights.find((row) => row.id === form) ?? null;
    const linked = Boolean(editing?.linked);

    function openNew() {
        setForm("new");
        setWeight("");
        setDate(today);
        setNotes("");
        setError(null);
        setConfirmId(null);
    }

    function openEdit(row: WeightEntry) {
        setForm(row.id);
        setWeight(row.weight);
        setDate(row.date);
        setNotes(row.notes ?? "");
        setError(null);
        setConfirmId(null);
    }

    function close() {
        setForm(null);
        setError(null);
    }

    async function save() {
        setPending(true);
        setError(null);
        const result = form === "new"
            ? await createPetWeight({ petId, weight, date, notes })
            : await updatePetWeight({ id: form ?? "", weight, date, notes });
        setPending(false);
        if (!result.success) {
            setError(message(copy, result.error));
            return;
        }
        close();
        router.refresh();
    }

    async function remove(id: string) {
        setPending(true);
        setError(null);
        const result = await deletePetWeight(id);
        setPending(false);
        if (!result.success) {
            setError(message(copy, result.error));
            return;
        }
        setConfirmId(null);
        if (form === id) close();
        router.refresh();
    }

    return (
        <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">{copy.weightHistory}</h2>
                {canAdd && form === null && weights.length > 0 && (
                    <button type="button" onClick={openNew} className={solid}>{copy.weightAdd}</button>
                )}
            </div>

            {form !== null && (
                <form
                    className="mt-4 grid gap-3 rounded-2xl border border-stone-200 p-4 sm:grid-cols-2 dark:border-stone-700"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void save();
                    }}
                >
                    <label className="text-sm text-stone-500">
                        {copy.weightKg}
                        <input type="number" required inputMode="decimal" min="0.001" max="999.999" step="0.001" value={weight} onChange={(event) => setWeight(event.target.value)} className={field} />
                    </label>
                    <label className="text-sm text-stone-500">
                        {copy.weightDate}
                        <input type="date" required={!linked} max={today} value={date} disabled={linked} onChange={(event) => setDate(event.target.value)} className={field} />
                    </label>
                    {linked && <p className="text-sm text-stone-500 sm:col-span-2">{copy.weightVisitDate}</p>}
                    <label className="text-sm text-stone-500 sm:col-span-2">
                        {copy.weightNotes}
                        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={1000} className={field} />
                    </label>
                    {error && <p className="text-sm text-red-700 sm:col-span-2 dark:text-red-300">{error}</p>}
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <button type="submit" disabled={pending} className={solid}>{copy.weightSave}</button>
                        <button type="button" onClick={close} className={quiet}>{copy.weightCancel}</button>
                    </div>
                </form>
            )}

            {weights.length === 0 ? (
                <div className="mt-4">
                    <p className="text-sm text-stone-500">{copy.weightEmpty}</p>
                    {canAdd && form === null && (
                        <button type="button" onClick={openNew} className={`${solid} mt-3`}>{copy.weightAdd}</button>
                    )}
                </div>
            ) : (
                <div className="mt-4 overflow-hidden rounded-2xl bg-white dark:bg-stone-900">
                    <div className={`hidden gap-3 border-b border-stone-100 px-4 py-2 text-xs font-medium text-stone-500 sm:grid dark:border-stone-800 ${canRecord ? "sm:grid-cols-[8rem_6rem_minmax(0,1fr)_auto]" : "sm:grid-cols-[8rem_6rem_minmax(0,1fr)]"}`}>
                        <span>{copy.weightDate}</span>
                        <span>{copy.tabWeight}</span>
                        <span>{copy.weightNotes}</span>
                        {canRecord && <span className="sr-only">{copy.weightActions}</span>}
                    </div>
                    <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                        {weights.map((row) => (
                            <li key={row.id} className={`grid grid-cols-1 gap-1 px-4 py-3 sm:items-center sm:gap-3 ${canRecord ? "sm:grid-cols-[8rem_6rem_minmax(0,1fr)_auto]" : "sm:grid-cols-[8rem_6rem_minmax(0,1fr)]"}`}>
                                <p className="text-sm text-stone-900 dark:text-stone-50">
                                    <span className="text-stone-500 sm:hidden">{copy.weightDate}: </span>
                                    {writtenDate(row.date, locale)}
                                </p>
                                <p className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                                    <span className="font-normal text-stone-500 sm:hidden">{copy.tabWeight}: </span>
                                    {shownWeight(row.weight, copy)}
                                </p>
                                <p className="text-sm text-stone-600 dark:text-stone-300">
                                    {row.notes?.trim() ? row.notes : <span className="text-stone-400">—</span>}
                                </p>
                                {canRecord && (
                                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                        {confirmId === row.id ? (
                                            <>
                                                <p className="text-sm text-stone-600 dark:text-stone-300">{copy.weightDeleteAsk}</p>
                                                <button type="button" disabled={pending} onClick={() => void remove(row.id)} className="rounded-full bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60">{copy.weightDelete}</button>
                                                <button type="button" onClick={() => setConfirmId(null)} className={quiet}>{copy.weightCancel}</button>
                                            </>
                                        ) : (
                                            <>
                                                <button type="button" onClick={() => openEdit(row)} className="text-sm font-medium text-emerald-900 hover:underline dark:text-emerald-200">{copy.weightEdit}</button>
                                                <button type="button" onClick={() => setConfirmId(row.id)} className="text-sm font-medium text-red-700 hover:underline dark:text-red-300">{copy.weightDelete}</button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                    {error && form === null && <p className="px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
                </div>
            )}
        </section>
    );
}
