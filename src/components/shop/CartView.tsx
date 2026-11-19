"use client";

import Link from "next/link";
import HistoryBack from "@/components/HistoryBack";
import { useEffect, useState } from "react";
import { quoteCart } from "@/lib/actions/shop";
import type { Copy, Locale } from "@/lib/i18n";
import { convertMinor, formatMoney, type Currency } from "@/lib/shop/money";
import ProductPhoto from "./ProductPhoto";

export type CartLine = {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    image?: string | null;
};

const storageKey = "village-vet-cart";
export const cartEvent = "village-vet-cart";

export function readCart(): CartLine[] {
    if (typeof window === "undefined") return [];
    try {
        const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as CartLine[];
        return Array.isArray(parsed) ? parsed.filter((line) => line && typeof line.productId === "string") : [];
    } catch {
        return [];
    }
}

function writeCart(lines: CartLine[]) {
    window.localStorage.setItem(storageKey, JSON.stringify(lines));
    window.dispatchEvent(new Event(cartEvent));
}

export function clearCart() {
    window.localStorage.removeItem(storageKey);
    window.dispatchEvent(new Event(cartEvent));
}

export function setCartQuantity(line: Omit<CartLine, "quantity">, quantity: number) {
    const cart = readCart().filter((item) => item.productId !== line.productId);
    const next = quantity < 1 ? cart : [...cart, { ...line, quantity: Math.min(20, quantity) }];
    writeCart(next);
}

export function addToCart(line: CartLine) {
    const current = readCart().find((item) => item.productId === line.productId)?.quantity ?? 0;
    setCartQuantity(line, Math.min(20, current + line.quantity));
}

export function useQuotedLines(lines: CartLine[], display: Currency) {
    const [prices, setPrices] = useState<Record<string, number> | null>(null);
    const ids = lines.map((line) => line.productId).join(",");

    useEffect(() => {
        let cancelled = false;
        void quoteCart(ids ? ids.split(",") : []).then((result) => {
            if (cancelled) return;
            const next: Record<string, number> = {};
            for (const product of result.products) {
                const shown = convertMinor(product.price, result.currency, display, result.rate);
                if (shown != null) next[product.id] = shown;
            }
            setPrices(next);
        });
        return () => {
            cancelled = true;
        };
    }, [ids, display]);

    return prices;
}

export default function CartView({ copy, locale, currency }: { copy: Copy; locale: Locale; currency: Currency }) {
    const [lines, setLines] = useState<CartLine[]>(() => readCart());
    const prices = useQuotedLines(lines, currency);
    const total = lines.reduce((sum, line) => sum + (prices?.[line.productId] ?? 0) * line.quantity, 0);

    function update(next: CartLine[]) {
        setLines(next);
        writeCart(next);
    }

    return (
        <div className="mt-8 flex flex-col gap-4">
            {lines.length === 0 && (
                <div className="rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-stone-200">
                    <p className="text-stone-600">{copy.shopCartEmpty}</p>
                    <HistoryBack fallback="/shop" className="mt-4 inline-flex cursor-pointer rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white">{copy.shopBackStore}</HistoryBack>
                </div>
            )}
            {lines.map((line) => (
                <div key={line.productId} className="flex gap-4 rounded-3xl bg-white p-3 ring-1 ring-stone-200">
                    <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-[#efe8dc]">
                        <ProductPhoto src={line.image ?? null} alt="" sizes="96px" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <p className="font-medium text-emerald-950">{line.name}</p>
                        <p className="mt-1 text-sm text-stone-500">{prices?.[line.productId] == null ? copy.shopOut : formatMoney(prices[line.productId], currency, locale)}</p>
                        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                            <label className="inline-flex items-center gap-2 text-sm text-stone-600">
                                <span className="sr-only">{copy.shopStockField}</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    value={line.quantity}
                                    onChange={(event) => {
                                        const quantity = Number(event.target.value);
                                        if (!Number.isFinite(quantity)) return;
                                        update(lines.map((item) => item.productId === line.productId ? { ...item, quantity: Math.min(20, Math.max(1, quantity)) } : item));
                                    }}
                                    className="w-16 rounded-full border border-stone-200 px-2 py-1 text-sm"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => update(lines.filter((item) => item.productId !== line.productId))}
                                className="text-sm text-stone-500 underline decoration-stone-300 underline-offset-4 hover:text-emerald-900"
                            >
                                {copy.shopRemove}
                            </button>
                        </div>
                    </div>
                    <p className="text-sm font-medium text-emerald-950">{prices?.[line.productId] == null ? "" : formatMoney(prices[line.productId] * line.quantity, currency, locale)}</p>
                </div>
            ))}
            {lines.length > 0 && (
                <div className="rounded-3xl bg-emerald-950 px-5 py-5 text-white">
                    <div className="flex items-center justify-between text-sm">
                        <span>{copy.shopTotal}</span>
                        <span className="text-lg font-medium">{prices ? formatMoney(total, currency, locale) : ""}</span>
                    </div>
                    <p className="mt-2 text-sm text-emerald-100">{copy.shopCartLead}</p>
                    <Link href="/shop/checkout" className="mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-medium text-emerald-950 transition duration-200 hover:scale-[1.02] hover:bg-emerald-50 hover:shadow-md">
                        {copy.shopProceed}
                    </Link>
                </div>
            )}
        </div>
    );
}
