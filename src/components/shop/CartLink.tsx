"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { intlLocale } from "@/lib/intl-locale";
import type { Locale } from "@/lib/i18n";
import { cartEvent, readCart } from "./CartView";

export default function CartLink({ label, locale, compact = false }: { label: string; locale: Locale; compact?: boolean }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const refresh = () => setCount(readCart().reduce((sum, line) => sum + line.quantity, 0));
        refresh();
        window.addEventListener(cartEvent, refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener(cartEvent, refresh);
            window.removeEventListener("storage", refresh);
        };
    }, []);

    const shown = new Intl.NumberFormat(intlLocale(locale)).format(count);
    const name = count > 0 ? `${label}, ${shown}` : label;

    if (compact) {
        return (
            <Link href="/shop/cart" aria-label={name} className="relative inline-flex size-11 items-center justify-center rounded-full text-emerald-950 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40">
                <ShoppingBag className="size-5" strokeWidth={1.75} />
                {count > 0 && (
                    <span className="absolute top-1 end-1 flex min-w-4 items-center justify-center rounded-full bg-emerald-900 px-1 text-[10px] leading-4 font-medium text-white">
                        {shown}
                    </span>
                )}
            </Link>
        );
    }

    return (
        <Link href="/shop/cart" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-emerald-950 shadow-sm ring-1 ring-stone-200 hover:ring-emerald-700">
            <ShoppingBag className="size-4" strokeWidth={1.75} />
            {label}
            {count > 0 && (
                <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-xs text-white">
                    {shown}
                </span>
            )}
        </Link>
    );
}
