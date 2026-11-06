"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { placeOrder } from "@/lib/actions/shop";

export type CartLine = { productId: string; name: string; quantity: number; price: number };

const storageKey = "village-vet-cart";

export function readCart(): CartLine[] {
    if (typeof window === "undefined") return [];
    try {
        const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as CartLine[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function addToCart(line: CartLine) {
    const cart = readCart();
    const existing = cart.find((item) => item.productId === line.productId);
    const next = existing
        ? cart.map((item) => item.productId === line.productId ? { ...item, quantity: item.quantity + line.quantity } : item)
        : [...cart, line];
    window.localStorage.setItem(storageKey, JSON.stringify(next));
}

export default function CartView() {
    const router = useRouter();
    const [lines, setLines] = useState<CartLine[]>(() => readCart());
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    return (
        <div className="mt-6 flex flex-col gap-3">
            {lines.length === 0 && <p className="text-sm text-stone-600">The cart is empty.</p>}
            {lines.map((line) => (
                <div key={line.productId} className="flex items-center justify-between rounded-xl border border-emerald-100 px-3 py-2 text-sm">
                    <span>{line.name} × {line.quantity}</span>
                    <span>{line.price * line.quantity} LBP</span>
                </div>
            ))}
            {error && <p className="text-sm text-red-700">{error}</p>}
            <p className="text-xs text-stone-500">Payment is cash when you collect the order. The clinic confirms the stock again when you submit.</p>
            <button
                type="button"
                disabled={pending || lines.length === 0}
                onClick={async () => {
                    setPending(true);
                    const result = await placeOrder({ items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })) });
                    setPending(false);
                    if (!result.success) {
                        setError(result.formErrors[0] ?? "Could not place the order.");
                        return;
                    }
                    window.localStorage.removeItem(storageKey);
                    setLines([]);
                    router.push("/shop/orders");
                    router.refresh();
                }}
                className="w-fit rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
                {pending ? "Sending…" : "Place order"}
            </button>
        </div>
    );
}
