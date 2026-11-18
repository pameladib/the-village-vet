"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBlock, deleteBlock } from "@/lib/actions/schedule";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";

type BlockInput = {
    date: string;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    scope: string;
};

type BlockConflict = {
    id: string;
    petName: string;
    detail: string;
    startAt: string;
    duration: number;
};

export type ListedBlock = {
    id: string;
    startAt: string;
    endAt: string;
    scope: "CLINIC" | "GROOMING" | "BOTH";
};

const field = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

const scopes = ["CLINIC", "GROOMING", "BOTH"] as const;

function formatVisit(startIso: string, duration: number, locale: Locale) {
    const time = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    const start = new Date(startIso);
    const end = new Date(start.getTime() + duration * 60_000);
    return `${time.format(start)}–${time.format(end)}`;
}

function beirutDay(iso: string) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export default function BlockForm({
    today,
    blocks,
    copy,
    locale,
}: {
    today: string;
    blocks: ListedBlock[];
    copy: Copy;
    locale: Locale;
}) {
    const router = useRouter();
    const [date, setDate] = useState("");
    const [scope, setScope] = useState<(typeof scopes)[number]>("CLINIC");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<ListedBlock | null>(null);
    const [added, setAdded] = useState<ListedBlock[]>([]);
    const [removed, setRemoved] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [pending, setPending] = useState<BlockInput | null>(null);
    const [conflicts, setConflicts] = useState<BlockConflict[] | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [removing, setRemoving] = useState(false);
    const [removeError, setRemoveError] = useState<string | null>(null);

    const dayLabel = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        weekday: "long",
        day: "numeric",
        month: "long",
    });
    const clock = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    const scopeLabel = { CLINIC: copy.blockVet, GROOMING: copy.blockGrooming, BOTH: copy.blockBoth };
    const scopeHelp = { CLINIC: copy.blockVetHelp, GROOMING: copy.blockGroomingHelp, BOTH: copy.blockBothHelp };

    const shown = [...blocks];
    for (const block of added) {
        if (!shown.some((item) => item.id === block.id)) shown.push(block);
    }
    const visible = shown.filter((block) => !removed.includes(block.id));
    visible.sort((left, right) => left.startAt.localeCompare(right.startAt));
    const groups: { day: string; items: ListedBlock[] }[] = [];
    for (const block of visible) {
        const day = beirutDay(block.startAt);
        const group = groups.find((item) => item.day === day);
        if (group) group.items.push(block);
        else groups.push({ day, items: [block] });
    }

    useEffect(() => {
        if (!conflicts) return;
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") setConflicts(null);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [conflicts]);

    async function save(input: BlockInput, confirm = false) {
        setSaving(true);
        const result = await createBlock({ ...input, confirm });
        setSaving(false);
        if (!result.success) {
            if ("conflicts" in result && result.conflicts) {
                setPending(input);
                setConflicts(result.conflicts);
                return;
            }
            setError(copy.blockSaveError);
            return;
        }
        setError(null);
        setPending(null);
        setConflicts(null);
        setDate("");
        setStart("");
        setEnd("");
        setScope("CLINIC");
        setAdded((current) => current.some((item) => item.id === result.block.id) ? current : [result.block, ...current]);
        setNotice(result.block);
        router.refresh();
    }

    async function remove(id: string) {
        setRemoving(true);
        setRemoveError(null);
        const result = await deleteBlock(id);
        setRemoving(false);
        if (!result.success) {
            setRemoveError(copy.blockRemoveError);
            return;
        }
        setRemoved((current) => current.includes(id) ? current : [...current, id]);
        setAdded((current) => current.filter((item) => item.id !== id));
        setConfirmId(null);
        router.refresh();
    }

    return (
        <div className="mt-6 flex flex-col gap-8">
            <section>
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.blockSection}</h2>
                <form
                    className="mt-3 rounded-2xl bg-white p-5 shadow-sm dark:bg-stone-900 sm:p-6"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        setError(null);
                        if (!start || !end || end <= start) {
                            setError(copy.blockTimeError);
                            return;
                        }
                        const [startHour, startMinute] = start.split(":").map(Number);
                        const [endHour, endMinute] = end.split(":").map(Number);
                        await save({ date, startHour, startMinute, endHour, endMinute, scope });
                    }}
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                            {copy.blockDate}
                            <input type="date" name="date" required min={today} value={date} onChange={(event) => setDate(event.target.value)} dir="ltr" className={`${field} text-left`} />
                        </label>
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                            {copy.blockApplies}
                            <select name="scope" value={scope} onChange={(event) => setScope(event.target.value as (typeof scopes)[number])} className={field}>
                                {scopes.map((item) => <option key={item} value={item}>{scopeLabel[item]}</option>)}
                            </select>
                        </label>
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                            {copy.blockStart}
                            <input type="time" name="start" required value={start} onChange={(event) => setStart(event.target.value)} dir="ltr" className={`${field} text-left`} />
                        </label>
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                            {copy.blockEnd}
                            <input type="time" name="end" required value={end} onChange={(event) => setEnd(event.target.value)} dir="ltr" className={`${field} text-left`} />
                        </label>
                    </div>
                    <ul className="mt-4 grid gap-2 sm:grid-cols-3">
                        {scopes.map((item) => (
                            <li key={item} className={`rounded-xl px-3 py-2 text-sm ${item === scope ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50" : "bg-stone-50 text-stone-600 dark:bg-stone-950 dark:text-stone-300"}`}>
                                <p className="font-medium">{scopeLabel[item]}</p>
                                <p className="mt-0.5">{scopeHelp[item]}</p>
                            </li>
                        ))}
                    </ul>
                    {error && <p className="mt-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
                    <button type="submit" disabled={saving} className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60 sm:w-fit">
                        {saving ? copy.blockAdding : copy.blockAdd}
                    </button>
                </form>
            </section>

            <section>
                <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-50">{copy.blockScheduled}</h2>
                {groups.length === 0 ? (
                    <p className="mt-3 rounded-2xl bg-white px-4 py-4 text-sm text-stone-500 dark:bg-stone-900">{copy.blockEmpty}</p>
                ) : (
                    <div className="mt-3 flex flex-col gap-3">
                        {groups.map((group) => (
                            <div key={group.day} className="rounded-2xl bg-white dark:bg-stone-900">
                                <h3 className="px-4 pt-4 text-base font-semibold text-emerald-950 dark:text-emerald-50">{dayLabel.format(new Date(group.items[0].startAt))}</h3>
                                <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                                    {group.items.map((block) => (
                                        <li key={block.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                <p className="text-sm text-stone-700 dark:text-stone-200" dir="ltr">
                                                    {clock.format(new Date(block.startAt))}–{clock.format(new Date(block.endAt))}
                                                </p>
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${block.scope === "BOTH" ? "bg-emerald-900 text-white" : "bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100"}`}>
                                                    {scopeLabel[block.scope]}
                                                </span>
                                            </div>
                                            {confirmId === block.id ? (
                                                <div className="flex flex-col items-start gap-2">
                                                    <p className="text-sm text-stone-700 dark:text-stone-200">{copy.blockRemoveAsk}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button type="button" disabled={removing} onClick={() => remove(block.id)} className="rounded-full bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60">
                                                            {copy.blockRemoveYes}
                                                        </button>
                                                        <button type="button" onClick={() => { setConfirmId(null); setRemoveError(null); }} className="rounded-full px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                                                            {copy.blockRemoveKeep}
                                                        </button>
                                                    </div>
                                                    {removeError && <p className="text-sm text-red-700 dark:text-red-300">{removeError}</p>}
                                                </div>
                                            ) : (
                                                <button type="button" onClick={() => { setConfirmId(block.id); setRemoveError(null); }} className="w-fit rounded-full border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">
                                                    {copy.blockRemove}
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {notice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4" role="presentation">
                    <div role="dialog" aria-modal="true" aria-labelledby="block-saved-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg dark:bg-stone-900">
                        <h2 id="block-saved-title" className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">{copy.blockSaved}</h2>
                        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{copy.blockSavedBody}</p>
                        <p className="mt-3 text-sm font-medium text-stone-800 dark:text-stone-100">
                            {dayLabel.format(new Date(notice.startAt))}
                            <span className="mt-1 block font-normal text-stone-500" dir="ltr">
                                {clock.format(new Date(notice.startAt))}–{clock.format(new Date(notice.endAt))} · {scopeLabel[notice.scope]}
                            </span>
                        </p>
                        <div className="mt-4 flex justify-end">
                            <button type="button" autoFocus onClick={() => setNotice(null)} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950">
                                {copy.blockSavedOk}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {conflicts && pending && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4" role="presentation" onClick={() => setConflicts(null)}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="block-conflict-title"
                        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg dark:bg-stone-900"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 id="block-conflict-title" className="text-lg font-semibold text-stone-950 dark:text-stone-50">{copy.blockConflictTitle}</h2>
                        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{copy.blockConflictBody}</p>
                        <ul className="mt-3 flex flex-col gap-2 text-sm text-stone-800 dark:text-stone-100">
                            {conflicts.map((appointment) => (
                                <li key={appointment.id} className="rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-700">
                                    <span className="font-medium">{appointment.petName}</span>
                                    {" · "}
                                    {appointment.detail}
                                    <span className="mt-0.5 block text-stone-500">{formatVisit(appointment.startAt, appointment.duration, locale)}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button type="button" autoFocus onClick={() => setConflicts(null)} className="rounded-full px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                                {copy.blockGoBack}
                            </button>
                            <button type="button" disabled={saving} onClick={() => save(pending, true)} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                                {copy.blockAnyway}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
