"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TreatmentForm, VaccineForm } from "@/components/pets/pet-profile/tabs/CareRecordForm";
import { rescheduleCareReminder } from "@/lib/actions/care";
import { todayInBeirut } from "@/lib/appointments/availability";
import { doseCopyKey, formatDateOnly } from "@/lib/clinic/vaccines";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";

export type CareTab = "overdue" | "today" | "upcoming";

export type CareRow = {
    id: string;
    kind: string;
    dose: string | null;
    dueAt: string;
    timing: "overdue" | "due" | "upcoming";
    petId: string;
    petName: string;
    ownerId: string;
    ownerName: string;
    species: "CAT" | "DOG";
    annualsBefore: number;
};

const tabs: CareTab[] = ["overdue", "today", "upcoming"];

const statusTone = {
    overdue: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    due: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    upcoming: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

function vaccineDoses(species: CareRow["species"]) {
    return species === "DOG"
        ? (["FIRST", "SECOND", "THIRD", "ANNUAL"] as const)
        : (["FIRST", "SECOND", "ANNUAL"] as const);
}

function vaccineType(dose: string | null, species: CareRow["species"]) {
    const allowed = vaccineDoses(species);
    if ((dose === "FIRST" || dose === "SECOND" || dose === "THIRD" || dose === "ANNUAL") && allowed.some((item) => item === dose)) {
        return dose;
    }
    if (dose?.startsWith("ANNUAL")) return "ANNUAL" as const;
    return allowed[0];
}

function treatmentType(row: CareRow): "DEWORMING" | "FLEA_TICK" {
    if (row.kind === "FLEA_TREATMENT" || row.dose === "FLEA_TICK" || row.dose === "FLEA_TREATMENT") return "FLEA_TICK";
    return "DEWORMING";
}

export default function CareBoard({
    tab,
    rows,
    copy,
    locale,
}: {
    tab: CareTab;
    rows: CareRow[];
    copy: Copy;
    locale: Locale;
}) {
    const router = useRouter();
    const [selected, setSelected] = useState(tab);
    const [query, setQuery] = useState("");

    useEffect(() => {
        setSelected(tab);
    }, [tab]);

    function choose(next: CareTab) {
        setSelected(next);
        router.replace(next === "overdue" ? "/admin/care" : `/admin/care?tab=${next}`, { scroll: false });
    }

    const counts: Record<CareTab, number> = {
        overdue: rows.filter((row) => row.timing === "overdue").length,
        today: rows.filter((row) => row.timing === "due").length,
        upcoming: rows.filter((row) => row.timing === "upcoming").length,
    };
    const labels: Record<CareTab, string> = {
        overdue: copy.overdue,
        today: copy.dueToday,
        upcoming: copy.careUpcoming,
    };
    const empty: Record<CareTab, string> = {
        overdue: copy.careEmptyOverdue,
        today: copy.careEmptyToday,
        upcoming: copy.careEmptyUpcoming,
    };

    const needle = query.trim().toLowerCase();
    const visible = useMemo(() => {
        const timing = selected === "today" ? "due" : selected;
        return rows.filter((row) => {
            if (row.timing !== timing) return false;
            if (!needle) return true;
            return row.petName.toLowerCase().includes(needle) || row.ownerName.toLowerCase().includes(needle);
        });
    }, [needle, rows, selected]);

    return (
        <div>
            <label className="mt-4 block">
                <span className="sr-only">{copy.careSearch}</span>
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={copy.careSearch}
                    className="w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                />
            </label>

            <div className="mt-4">
                <div className="flex justify-start">
                    <div role="tablist" aria-label={copy.careManagement} className="flex w-max min-w-0 max-w-full gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {tabs.map((id) => {
                            const active = selected === id;
                            const late = id === "overdue" && counts[id] > 0 && !active;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    id={`care-${id}`}
                                    aria-selected={active}
                                    aria-controls={`care-${id}-panel`}
                                    onClick={() => choose(id)}
                                    className={
                                        active
                                            ? "inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                                            : "inline-flex shrink-0 items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-900 shadow-sm transition duration-200 hover:border-emerald-700 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50 dark:hover:border-emerald-400 dark:hover:bg-emerald-950/40"
                                    }
                                >
                                    {labels[id]}
                                    <span
                                        className={
                                            late
                                                ? "rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-900 dark:bg-red-900/60 dark:text-red-100"
                                                : active
                                                  ? "rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold"
                                                  : "rounded-full bg-stone-100 px-1.5 py-0.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                                        }
                                    >
                                        {counts[id]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div role="tabpanel" id={`care-${selected}-panel`} aria-labelledby={`care-${selected}`} className="mt-3">
                    {visible.length === 0 ? (
                        <p className="text-sm text-stone-500">{needle ? copy.careNoMatch : empty[selected]}</p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {visible.map((row) => (
                                <CareItem key={row.id} row={row} copy={copy} locale={locale} />
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

function CareItem({ row, copy, locale }: { row: CareRow; copy: Copy; locale: Locale }) {
    const router = useRouter();
    const [recording, setRecording] = useState(false);
    const [moving, setMoving] = useState(false);
    const [dueAt, setDueAt] = useState(() => formatDateOnly(new Date(row.dueAt)));
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
    const when = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Beirut", day: "numeric", month: "short", year: "numeric" });
    const labelKey = doseCopyKey(row.dose) ?? (row.kind === "DEWORMING" ? "doseDeworming" : row.kind === "FLEA_TREATMENT" ? "doseFlea" : "doseAnnual");
    const status = row.timing === "due" ? copy.dueToday : row.timing === "overdue" ? copy.overdue : copy.careUpcoming;

    async function move(event: FormEvent) {
        event.preventDefault();
        setPending(true);
        setMessage(null);
        const result = await rescheduleCareReminder({ id: row.id, dueAt });
        setPending(false);
        if (!result.success) {
            setMessage({
                text: result.error === "missing" ? copy.careErrMissing : result.error === "denied" ? copy.errCareSave : copy.careErrDate,
                error: true,
            });
            return;
        }
        setMessage({ text: copy.careDateSaved, error: false });
        setMoving(false);
        router.refresh();
    }

    return (
        <li className="min-w-0 rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate font-medium text-stone-900 dark:text-stone-50">
                        <Link href={`/pets/${row.petId}`} className="hover:underline">{row.petName}</Link>
                    </p>
                    <p className="truncate text-sm text-stone-500">
                        <Link href={`/admin/owners/${row.ownerId}`} className="hover:underline">{row.ownerName}</Link>
                    </p>
                    <p className="mt-1 text-sm text-stone-700 dark:text-stone-200">{copy[labelKey]}</p>
                    <p className="mt-0.5 text-xs text-stone-500">{when.format(new Date(row.dueAt))}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[row.timing]}`}>{status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
                <button
                    type="button"
                    aria-expanded={recording}
                    onClick={() => { setMessage(null); setMoving(false); setRecording((open) => !open); }}
                    className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950"
                >
                    {copy.recordCare}
                </button>
                <button
                    type="button"
                    aria-expanded={moving}
                    onClick={() => { setMessage(null); setRecording(false); setMoving((open) => !open); }}
                    className={
                        moving
                            ? "rounded-full border border-emerald-700 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-100"
                            : "rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-800 hover:border-emerald-700 dark:border-stone-700 dark:text-stone-100"
                    }
                >
                    {copy.reschedule}
                </button>
            </div>
            {recording && row.kind === "VACCINATION" && (
                <VaccineForm
                    petId={row.petId}
                    species={row.species}
                    annualsBefore={row.annualsBefore}
                    doses={[...vaccineDoses(row.species)]}
                    draft={{ type: vaccineType(row.dose, row.species), administeredAt: todayInBeirut(), nextDueAt: "" }}
                    copy={copy}
                    onClose={() => setRecording(false)}
                />
            )}
            {recording && row.kind !== "VACCINATION" && (
                <TreatmentForm
                    petId={row.petId}
                    draft={{ type: treatmentType(row), administeredAt: todayInBeirut(), nextDueAt: "" }}
                    copy={copy}
                    onClose={() => setRecording(false)}
                />
            )}
            {moving && (
                <form className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2" onSubmit={(event) => void move(event)}>
                    <label className="flex max-w-full flex-col gap-1 text-sm text-stone-600 dark:text-stone-300">
                        {copy.careNewDue}
                        <input
                            type="date"
                            required
                            value={dueAt}
                            onChange={(event) => setDueAt(event.target.value)}
                            className="w-44 max-w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                        />
                    </label>
                    <button type="submit" disabled={pending} className="w-fit shrink-0 rounded-full bg-emerald-900 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                        {copy.careSaveDue}
                    </button>
                </form>
            )}
            {message && (
                <p className={message.error ? "mt-2 text-sm text-red-700 dark:text-red-300" : "mt-2 text-sm text-emerald-800 dark:text-emerald-200"}>
                    {message.text}
                </p>
            )}
        </li>
    );
}
