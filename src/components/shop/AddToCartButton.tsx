"use client";

import { useCallback, useEffect, useState } from "react";
import AddedToCartToast from "./AddedToCartToast";
import { addToCart, cartEvent, readCart, setCartQuantity } from "./CartView";
import type { Copy, Locale } from "@/lib/i18n";

export default function AddToCartButton({
    productId,
    name,
    price,
    stock,
    image,
    copy,
    locale = "en",
    compact = false,
}: {
    productId: string;
    name: string;
    price: number;
    stock: number;
    image: string | null;
    copy: Copy;
    locale?: Locale;
    compact?: boolean;
}) {
    const max = Math.min(Math.max(stock, 0), 20);
    const [inCart, setInCart] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ id: number; name: string; quantity: number } | null>(null);
    const dismissNotice = useCallback(() => setNotice(null), []);

    useEffect(() => {
        const refresh = () => {
            const current = readCart().find((line) => line.productId === productId)?.quantity ?? 0;
            setInCart(current);
        };
        refresh();
        window.addEventListener(cartEvent, refresh);
        return () => window.removeEventListener(cartEvent, refresh);
    }, [productId]);

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

    const room = Math.max(0, max - inCart);

    function addSelected() {
        if (quantity < 1 || quantity > room) {
            setError(copy.shopErrLineStock);
            return;
        }
        setError(null);
        addToCart({ ...line, quantity });
        setNotice({ id: Date.now(), name, quantity });
        setQuantity(1);
    }

    return (
        <div className="mt-6">
            <div className="flex items-center gap-2">
                <div className="inline-flex items-center rounded-full bg-emerald-900 text-white" role="group" aria-label={copy.shopQty}>
                    <button type="button" aria-label={copy.shopRemove} disabled={quantity <= 1} onClick={() => { setError(null); setQuantity((value) => Math.max(1, value - 1)); }} className="px-3.5 py-2.5 text-sm hover:bg-emerald-950 disabled:opacity-40">−</button>
                    <span className="min-w-6 text-center text-sm font-medium tabular-nums">{quantity}</span>
                    <button type="button" aria-label={copy.shopAdd} disabled={quantity >= room} onClick={() => { setError(null); setQuantity((value) => Math.min(room, value + 1)); }} className="px-3.5 py-2.5 text-sm hover:bg-emerald-950 disabled:opacity-40">+</button>
                </div>
                <button type="button" onClick={addSelected} className="rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-950">
                    {copy.shopAdd}
                </button>
            </div>
            {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
            {notice && (
                <AddedToCartToast
                    key={notice.id}
                    name={notice.name}
                    quantity={notice.quantity}
                    locale={locale}
                    copy={copy}
                    onClose={dismissNotice}
                />
            )}
        </div>
    );
}
