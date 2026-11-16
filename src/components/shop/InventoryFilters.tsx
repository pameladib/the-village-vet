"use client";

import { useRouter } from "next/navigation";
import type { Copy } from "@/lib/i18n";

export type InventoryQuery = {
    q: string;
    cat: string;
    status: string;
    sort: string;
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
}: {
    copy: Copy;
    query: InventoryQuery;
    categories: { id: string; name: string }[];
}) {
    const router = useRouter();
    const field = "rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

    function go(next: Partial<InventoryQuery>, form?: HTMLFormElement | null) {
        const typed = form ? String(new FormData(form).get("q") ?? "").trim() : query.q;
        router.push(inventoryHref({ ...query, q: typed, ...next }));
    }

    return (
        <form
            className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-end"
            action="/admin/inventory"
            onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                go({ q: String(data.get("q") ?? "").trim() });
            }}
        >
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-stone-500">
                {copy.invSearch}
                <input key={query.q} name="q" defaultValue={query.q} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-stone-500">
                {copy.invCategory}
                <select value={query.cat} onChange={(event) => go({ cat: event.target.value }, event.currentTarget.form)} className={field}>
                    <option value="">{copy.invAllCategories}</option>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-stone-500">
                {copy.invStatus}
                <select value={query.status} onChange={(event) => go({ status: event.target.value }, event.currentTarget.form)} className={field}>
                    <option value="">{copy.invAllStatuses}</option>
                    <option value="in">{copy.invInStock}</option>
                    <option value="low">{copy.invLowStock}</option>
                    <option value="out">{copy.invOutStock}</option>
                </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-stone-500">
                {copy.invSort}
                <select value={query.sort} onChange={(event) => go({ sort: event.target.value }, event.currentTarget.form)} className={field}>
                    <option value="name">{copy.invSortName}</option>
                    <option value="low">{copy.invSortLow}</option>
                    <option value="high">{copy.invSortHigh}</option>
                </select>
            </label>
            <button className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950">{copy.search}</button>
        </form>
    );
}
