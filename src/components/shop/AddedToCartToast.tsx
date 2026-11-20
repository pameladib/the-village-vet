"use client";

import Link from "next/link";
import { Check, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";

export default function AddedToCartToast({
    name,
    quantity,
    locale,
    copy,
    onClose,
}: {
    name: string;
    quantity: number;
    locale: Locale;
    copy: Copy;
    onClose: () => void;
}) {
    useEffect(() => {
        const timer = window.setTimeout(onClose, 5000);
        return () => window.clearTimeout(timer);
    }, [onClose]);

    const amount = new Intl.NumberFormat(intlLocale(locale)).format(quantity);

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:end-4 sm:w-full sm:max-w-sm"
            onKeyDown={(event) => {
                if (event.key === "Escape") onClose();
            }}
        >
            <div className="relative rounded-2xl bg-white shadow-lg ring-1 ring-stone-200">
                <Link
                    href="/shop/cart"
                    className="flex items-start gap-3 rounded-2xl px-4 py-3 pe-12 text-start hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                    <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                        <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-sm font-semibold text-emerald-950">{copy.shopAddedTitle}</span>
                        <span className="mt-0.5 block truncate text-sm text-stone-600">{name} × {amount}</span>
                        <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-emerald-800">
                            {copy.shopViewCart}
                            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                        </span>
                    </span>
                </Link>
                <button
                    type="button"
                    aria-label={copy.closeMenu}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onClose();
                    }}
                    className="absolute top-2 end-2 inline-flex size-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
