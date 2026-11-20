"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { toast } from "sonner";
import { cancelVisitFollowUp, completeVisitFollowUp, rescheduleVisitFollowUp } from "@/lib/actions/follow-ups";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { ownerChat } from "@/lib/clinic/phone";
import { followUpChatLink, followUpText } from "@/lib/visits/follow-up";

export type FollowUpItem = {
    id: string;
    dueOn: string;
    notes: string | null;
    timing: "overdue" | "due" | "upcoming";
    petId: string;
    petSlug: string;
    petName: string;
    ownerId: string;
    ownerName: string;
    phone: string;
    sex: "MALE" | "FEMALE";
};

type Tab = "overdue" | "today" | "upcoming";
const tabs: Tab[] = ["overdue", "today", "upcoming"];

const quiet = "rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-emerald-700 disabled:opacity-60 dark:border-stone-600 dark:text-stone-200";
const solid = "rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60";
const overdueTone = "text-red-700 dark:text-red-300";
const dueTone = "text-[#9A6700] dark:text-[#FBBF24]";
const upcomingTone = "text-[#6B7280] dark:text-[#D1D5DB]";
const metaTone = "text-[#6B7280] dark:text-[#D1D5DB]";
const noteTone = "text-[#525252] dark:text-stone-300";

function dateTone(timing: FollowUpItem["timing"]) {
    if (timing === "overdue") return overdueTone;
    if (timing === "due") return dueTone;
    return upcomingTone;
}

function writtenDate(value: string, locale: Locale) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

export default function FollowUpList({ copy, locale, rows, tab, highlightId = null }: { copy: Copy; locale: Locale; rows: FollowUpItem[]; tab: Tab; highlightId?: string | null }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const counts: Record<Tab, number> = {
        overdue: rows.filter((row) => row.timing === "overdue").length,
        today: rows.filter((row) => row.timing === "due").length,
        upcoming: rows.filter((row) => row.timing === "upcoming").length,
    };
    const labels: Record<Tab, string> = {
        overdue: copy.followUpOverdue,
        today: copy.followUpDueToday,
        upcoming: copy.careUpcoming,
    };
    const empty: Record<Tab, string> = {
        overdue: copy.followUpEmptyOverdue,
        today: copy.followUpEmptyToday,
        upcoming: copy.followUpEmptyUpcoming,
    };
    const needle = query.trim().toLowerCase();
    const timing = tab === "today" ? "due" : tab;
    const visible = rows.filter((row) => {
        if (row.timing !== timing) return false;
        if (!needle) return true;
        return row.petName.toLowerCase().includes(needle) || row.ownerName.toLowerCase().includes(needle);
    });

    useEffect(() => {
        if (!highlightId) return;
        toast.success(copy.followUpAdded, { id: "follow-up-added" });
        document.getElementById(`follow-up-${highlightId}`)?.scrollIntoView({ block: "center" });
        const timer = window.setTimeout(() => {
            router.replace(tab === "overdue" ? "/admin/follow-ups" : `/admin/follow-ups?tab=${tab}`, { scroll: false });
        }, 5000);
        return () => window.clearTimeout(timer);
    }, [copy.followUpAdded, highlightId, router, tab]);

    function choose(next: Tab) {
        router.replace(next === "overdue" ? "/admin/follow-ups" : `/admin/follow-ups?tab=${next}`, { scroll: false });
    }

    return (
        <div>
            <label className="mt-4 block">
                <span className="sr-only">{copy.followUpSearch}</span>
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={copy.followUpSearch}
                    className="w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                />
            </label>
            <div className="mt-4">
                <div className="flex justify-start">
                    <div role="tablist" aria-label={copy.followUpReminders} className="flex w-max min-w-0 max-w-full gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {tabs.map((id) => {
                            const active = tab === id;
                            const badge = active
                                ? "rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold"
                                : id === "overdue" && counts[id] > 0
                                    ? "rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-900 dark:bg-red-900/60 dark:text-red-100"
                                    : id === "today" && counts[id] > 0
                                        ? "rounded-full bg-[#FBF3D5] px-1.5 py-0.5 text-xs font-semibold text-[#9A6700] dark:bg-[#9A6700]/25 dark:text-[#FBBF24]"
                                        : "rounded-full bg-stone-100 px-1.5 py-0.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300";
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => choose(id)}
                                    className={
                                        active
                                            ? "inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                                            : "inline-flex shrink-0 items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-900 shadow-sm transition duration-200 hover:border-emerald-700 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50 dark:hover:border-emerald-400 dark:hover:bg-emerald-950/40"
                                    }
                                >
                                    {labels[id]}
                                    <span className={badge}>
                                        {counts[id]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                {visible.length === 0 ? (
                    <p className="mt-3 text-sm text-stone-500">{needle ? copy.followUpNoMatch : empty[tab]}</p>
                ) : (
                    <ul className="mt-3 divide-y divide-stone-200 dark:divide-stone-800">
                        {visible.map((row) => <FollowUpRow key={row.id} copy={copy} locale={locale} row={row} highlight={row.id === highlightId} />)}
                    </ul>
                )}
            </div>
        </div>
    );
}

function FollowUpRow({ copy, locale, row, highlight }: { copy: Copy; locale: Locale; row: FollowUpItem; highlight: boolean }) {
    const router = useRouter();
    const [panel, setPanel] = useState<"menu" | "complete" | "reschedule" | "cancel" | null>(null);
    const [date, setDate] = useState(row.dueOn);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const ask = row.sex === "FEMALE" ? copy.followUpAskShe : copy.followUpAskHe;
    const message = followUpText(copy.followUpMessage, { owner: row.ownerName, pet: row.petName, clinic: copy.clinicName, ask });
    const chat = followUpChatLink(row.phone, message);
    const ownerWhatsapp = ownerChat(row.phone);

    async function run(action: () => Promise<{ success: boolean; error?: string }>) {
        setPending(true);
        setError(null);
        const result = await action();
        setPending(false);
        if (!result.success) {
            setError(result.error === "date" ? copy.followUpDateError : copy.visitSaveError);
            return;
        }
        setPanel(null);
        router.refresh();
    }

    return (
        <li id={`follow-up-${row.id}`} className={`rounded-xl px-3 py-3 transition-colors duration-700 ${highlight ? "bg-emerald-50 ring-2 ring-emerald-600/35 dark:bg-emerald-950/40" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <Link href={`/pets/${row.petSlug}`} className="text-sm font-medium text-emerald-900 hover:underline dark:text-emerald-200">{row.petName}</Link>
                    <p className={`text-sm ${metaTone}`}>
                        <Link href={`/admin/owners/${row.ownerId}`} className="hover:underline">{row.ownerName}</Link>
                        {ownerWhatsapp ? <>{" · "}<a href={ownerWhatsapp} target="_blank" rel="noopener noreferrer" className="hover:underline">{row.phone}</a></> : null}
                    </p>
                    <p className={`mt-1 text-sm ${dateTone(row.timing)}`}>{writtenDate(row.dueOn, locale)}</p>
                    {row.notes && <p className={`mt-1 text-sm leading-6 ${noteTone}`}>{row.notes}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {chat ? (
                        <a href={chat} target="_blank" rel="noopener noreferrer" className={solid}>{copy.followUpContact}</a>
                    ) : (
                        <button type="button" disabled className={solid}>{copy.followUpContact}</button>
                    )}
                    <button type="button" disabled={pending} onClick={() => setPanel(panel === "complete" ? null : "complete")} className={quiet}>{copy.followUpComplete}</button>
                    <div className="relative">
                        <button type="button" aria-label={copy.followUpMenu} aria-expanded={panel === "menu"} onClick={() => setPanel(panel === "menu" ? null : "menu")} className="rounded-full p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800">
                            <Ellipsis className="size-4" />
                        </button>
                        {panel === "menu" && (
                            <div className="absolute end-0 z-10 mt-1 w-44 rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
                                <button type="button" onClick={() => setPanel("reschedule")} className="block w-full px-3 py-2 text-start text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800">{copy.followUpReschedule}</button>
                                <button type="button" onClick={() => setPanel("cancel")} className="block w-full px-3 py-2 text-start text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800">{copy.followUpCancel}</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {!chat && <p className="mt-2 text-sm text-stone-500">{copy.followUpNoPhone}</p>}
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
            {panel === "complete" && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
                    <p>{copy.followUpCompleteAsk}</p>
                    <button type="button" disabled={pending} onClick={() => void run(() => completeVisitFollowUp(row.id))} className={solid}>{copy.followUpComplete}</button>
                    <button type="button" disabled={pending} onClick={() => setPanel(null)} className={quiet}>{copy.followUpKeep}</button>
                </div>
            )}
            {panel === "reschedule" && (
                <form
                    className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void run(() => rescheduleVisitFollowUp(row.id, date));
                    }}
                >
                    <label className="flex w-44 max-w-full flex-col gap-1 text-sm text-stone-500">
                        {copy.followUpDate}
                        <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50" />
                    </label>
                    <button type="submit" disabled={pending} className={`${solid} w-fit shrink-0`}>{copy.followUpSaveDate}</button>
                </form>
            )}
            {panel === "cancel" && (
                <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <p>{copy.followUpCancelAsk}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={pending} onClick={() => void run(() => cancelVisitFollowUp(row.id))} className={solid}>{copy.followUpCancel}</button>
                        <button type="button" disabled={pending} onClick={() => setPanel(null)} className={quiet}>{copy.followUpKeep}</button>
                    </div>
                </div>
            )}
        </li>
    );
}
