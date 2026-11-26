"use client";

import { useState } from "react";
import type { Copy, Locale } from "@/lib/i18n";
import { presentPrice, type Currency } from "@/lib/shop/money";
import { sellableName } from "@/lib/shop/variants";
import AddToCartButton from "./AddToCartButton";

type Choice = { id: string; label: string; price: number; stock: number };

export default function VariantPurchase({
    productName,
    image,
    variants,
    copy,
    locale,
    currency,
    display,
    rate,
}: {
    productName: string;
    image: string | null;
    variants: Choice[];
    copy: Copy;
    locale: Locale;
    currency: Currency;
    display: Currency;
    rate: number;
}) {
    const [selected, setSelected] = useState(variants[0]?.id ?? "");
    const variant = variants.find((item) => item.id === selected) ?? variants[0];
    if (!variant) return null;
    const name = sellableName(productName, variant.label);

    return (
        <>
            {variants.length === 1 && variant.label && (
                <p className="mt-6 text-sm font-medium text-emerald-950">{variant.label}</p>
            )}
            {variants.length > 1 && (
                <div className="mt-6 flex flex-wrap gap-2" role="radiogroup" aria-label={copy.shopVersions}>
                    {variants.map((option) => {
                        const active = option.id === variant.id;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => setSelected(option.id)}
                                className={active
                                    ? "rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white"
                                    : "rounded-full bg-white px-4 py-2 text-sm font-medium text-emerald-950 ring-1 ring-stone-200 hover:ring-emerald-700"}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            )}
            <p className={`${variants.length > 1 || variant.label ? "mt-4" : "mt-6"} text-2xl text-emerald-950`}>{presentPrice(variant.price, currency, display, rate, locale)}</p>
            <p className="mt-2 text-sm text-stone-500">{variant.stock > 0 ? copy.shopStockIn : copy.shopOut}</p>
            <AddToCartButton key={variant.id} variantId={variant.id} name={name} price={variant.price} stock={variant.stock} image={image} copy={copy} locale={locale} />
        </>
    );
}
