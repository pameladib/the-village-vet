"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { intlLocale } from "@/lib/intl-locale";
import type { Locale } from "@/lib/i18n";
import { cartEvent, readCart } from "./CartView";

export default function CartLink({ label, locale }: { label: string; locale: Locale }) {
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

    return (
        <Link href="/shop/cart" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-emerald-950 shadow-sm ring-1 ring-stone-200 hover:ring-emerald-700">
            <ShoppingBag className="size-4" strokeWidth={1.75} />
            {label}
            {count > 0 && (
                <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-xs text-white">
                    {new Intl.NumberFormat(intlLocale(locale)).format(count)}
                </span>
            )}
        </Link>
    );
}
