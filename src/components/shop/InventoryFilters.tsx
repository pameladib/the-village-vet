"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Copy } from "@/lib/i18n";

export type InventoryQuery = {
    q: string;
    cat: string;
    status: string;
    sort: string;
};

export type InventorySummaryCard = {
    status: "" | "in" | "low" | "out";
    label: string;
    value: string;
    tone: string;
};

export function inventoryHref(query: InventoryQuery) {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.cat) params.set("cat", query.cat);
    if (query.status) params.set("status", query.status);
    if (query.sort && query.sort !== "name") params.set("sort", query.sort);
    const search = params.toString();
    return search ? `/admin/inventory?${search}` : "/admin/inventory";
}

export default function InventoryFilters({
    copy,
    query,
    categories,
    cards,
    children,
}: {
    copy: Copy;
    query: InventoryQuery;
    categories: { id: string; name: string }[];
    cards: InventorySummaryCard[];
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [value, setValue] = useState(query.q);
    const [pending, startTransition] = useTransition();
    const requested = useRef(query.q);
    const searchTimer = useRef<number | null>(null);
    const field = "rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

    useEffect(() => {
        if (query.q === requested.current) return;
        requested.current = query.q;
        setValue(query.q);
    }, [query.q]);

    useEffect(() => {
        const next = value.trim();
        if (next === query.q) return;
        const delay = next ? 200 : 0;
        searchTimer.current = window.setTimeout(() => {
            requested.current = next;
            startTransition(() => {
                router.replace(inventoryHref({ ...query, q: next }), { scroll: false });
            });
        }, delay);
        return () => {
            if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
        };
    }, [value, query, router]);

    function go(next: Partial<InventoryQuery>) {
        if (searchTimer.current !== null) window.clearTimeout(searchTimer.current);
        const q = value.trim();
        requested.current = q;
        startTransition(() => {
            router.push(inventoryHref({ ...query, q, ...next }), { scroll: false });
        });
    }

    return (
        <>
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                {cards.map((card) => {
                    const selected = query.status === card.status;
                    return (
                        <button
                            key={card.status || "all"}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => go({ status: card.status })}
                            className={`rounded-2xl border bg-white px-3 py-2.5 text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:bg-stone-900 ${selected ? "border-emerald-800 ring-1 ring-emerald-800 dark:border-emerald-300 dark:ring-emerald-300" : "border-[#E5E7EB] hover:border-emerald-800 dark:border-stone-800 dark:hover:border-emerald-300"}`}
                        >
                            <p className="text-xs text-stone-500">{card.label}</p>
                            <p className={`mt-1 text-xl font-semibold ${card.tone}`}>{card.value}</p>
                        </button>
                    );
                })}
            </div>
            <form className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-end" onSubmit={(event) => event.preventDefault()}>
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-stone-500">
                    {copy.invSearch}
                    <input
                        name="q"
                        type="search"
                        value={value}
                        autoComplete="off"
                        onChange={(event) => setValue(event.target.value)}
                        className={field}
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-stone-500">
                    {copy.invCategory}
                    <select value={query.cat} onChange={(event) => go({ cat: event.target.value })} className={field}>
                        <option value="">{copy.invAllCategories}</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-stone-500">
                    {copy.invStatus}
                    <select value={query.status} onChange={(event) => go({ status: event.target.value })} className={field}>
                        <option value="">{copy.invAllStatuses}</option>
                        <option value="in">{copy.invInStock}</option>
                        <option value="low">{copy.invLowStock}</option>
                        <option value="out">{copy.invOutStock}</option>
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-stone-500">
                    {copy.invSort}
                    <select value={query.sort} onChange={(event) => go({ sort: event.target.value })} className={field}>
                        <option value="name">{copy.invSortName}</option>
                        <option value="za">{copy.invSortNameDesc}</option>
                        <option value="low">{copy.invSortLow}</option>
                        <option value="high">{copy.invSortHigh}</option>
                    </select>
                </label>
            </form>
            <div className={pending ? "opacity-60 transition-opacity" : "transition-opacity"}>{children}</div>
        </>
    );
}
