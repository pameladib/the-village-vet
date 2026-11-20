"use client";

import { useEffect, useState } from "react";
import { cartEvent, readCart, setCartQuantity } from "./CartView";
import type { Copy } from "@/lib/i18n";

export default function AddToCartButton({
    productId,
    name,
    price,
    stock,
    image,
    copy,
    compact = false,
}: {
    productId: string;
    name: string;
    price: number;
    stock: number;
    image: string | null;
    copy: Copy;
    compact?: boolean;
}) {
    const max = Math.min(Math.max(stock, 0), 20);
    const [inCart, setInCart] = useState(0);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const refresh = () => {
            const current = readCart().find((line) => line.productId === productId)?.quantity ?? 0;
            setInCart(current);
            if (!compact && current > 0) setQuantity(current);
        };
        refresh();
        window.addEventListener(cartEvent, refresh);
        return () => window.removeEventListener(cartEvent, refresh);
    }, [compact, productId]);

    const line = { productId, name, price, image };

    if (stock < 1 && inCart < 1) {
        return <p className={`text-sm font-medium text-stone-500 ${compact ? "" : "mt-4"}`}>{copy.shopOut}</p>;
    }

    if (compact) {
        if (inCart < 1) {
            return (
                <button type="button" onClick={() => setCartQuantity(line, 1)} className="rounded-full bg-emerald-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-950">
                    {copy.shopAdd}
                </button>
            );
        }
        return (
            <div className="inline-flex items-center rounded-full bg-emerald-900 text-white">
                <button type="button" aria-label={copy.shopRemove} onClick={() => setCartQuantity(line, inCart - 1)} className="px-2.5 py-1.5 text-sm hover:bg-emerald-950">−</button>
                <span className="min-w-5 text-center text-xs font-medium">{inCart}</span>
                <button type="button" aria-label={copy.shopAdd} disabled={inCart >= max} onClick={() => setCartQuantity(line, inCart + 1)} className="px-2.5 py-1.5 text-sm hover:bg-emerald-950 disabled:opacity-40">+</button>
            </div>
        );
    }

    return (
        <div className="mt-6 flex items-center gap-2">
            <div className="inline-flex items-center rounded-full bg-emerald-900 text-white" role="group" aria-label={copy.shopQty}>
                <button type="button" aria-label={copy.shopRemove} disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="px-3.5 py-2.5 text-sm hover:bg-emerald-950 disabled:opacity-40">−</button>
                <span className="min-w-6 text-center text-sm font-medium tabular-nums">{quantity}</span>
                <button type="button" aria-label={copy.shopAdd} disabled={quantity >= max} onClick={() => setQuantity((value) => Math.min(max, value + 1))} className="px-3.5 py-2.5 text-sm hover:bg-emerald-950 disabled:opacity-40">+</button>
            </div>
            <button type="button" onClick={() => setCartQuantity(line, quantity)} className="rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-950">
                {copy.shopAdd}
            </button>
        </div>
    );
}
