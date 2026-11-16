"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { shopHref, type ShopQuery } from "@/lib/shop/catalog";
import type { Copy } from "@/lib/i18n";

export default function ShopControls({ copy, filters }: { copy: Copy; filters: ShopQuery }) {
    const router = useRouter();

    function go(next: Partial<ShopQuery>) {
        router.push(shopHref({ ...filters, ...next }));
    }

    const chip = "rounded-full px-4 py-2.5 text-sm";

    return (
        <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                go({ q: String(data.get("q") ?? "") });
            }}
        >
            <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative block min-w-0 flex-1">
                    <span className="sr-only">{copy.shopSearchLabel}</span>
                    <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-stone-400" strokeWidth={1.75} />
                    <input
                        name="q"
                        defaultValue={filters.q}
                        placeholder={copy.shopSearchPlaceholder}
                        className="w-full rounded-full border border-stone-200 bg-white py-3 ps-11 pe-4 text-sm text-stone-800 outline-none focus:border-emerald-700"
                    />
                </label>
                <button type="submit" className="rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-950">{copy.search}</button>
            </div>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    aria-pressed={filters.stock === "in"}
                    onClick={() => go({ stock: filters.stock === "in" ? "any" : "in" })}
                    className={`${chip} ${filters.stock === "in" ? "bg-emerald-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-emerald-700"}`}
                >
                    {copy.shopStockIn}
                </button>
                <button
                    type="button"
                    aria-pressed={filters.sort === "price-asc"}
                    onClick={() => go({ sort: filters.sort === "price-asc" ? "name" : "price-asc" })}
                    className={`${chip} ${filters.sort === "price-asc" ? "bg-emerald-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-emerald-700"}`}
                >
                    {copy.shopSortPriceLow}
                </button>
                <button
                    type="button"
                    aria-pressed={filters.sort === "price-desc"}
                    onClick={() => go({ sort: filters.sort === "price-desc" ? "name" : "price-desc" })}
                    className={`${chip} ${filters.sort === "price-desc" ? "bg-emerald-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-emerald-700"}`}
                >
                    {copy.shopSortPriceHigh}
                </button>
            </div>
        </form>
    );
}
