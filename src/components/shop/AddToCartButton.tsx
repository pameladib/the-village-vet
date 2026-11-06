"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "./CartView";

export default function AddToCartButton({ productId, name, price, stock }: { productId: string; name: string; price: number; stock: number }) {
    const router = useRouter();
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);

    return (
        <div className="mt-4 flex items-center gap-2">
            <input
                type="number"
                min={1}
                max={Math.min(stock, 20)}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="w-20 rounded-lg border border-emerald-200 px-2 py-2 text-sm dark:border-emerald-900 dark:bg-stone-950"
            />
            <button
                type="button"
                disabled={stock < 1}
                onClick={() => {
                    addToCart({ productId, name, price, quantity });
                    setAdded(true);
                    router.push("/shop/cart");
                }}
                className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
                {stock < 1 ? "Out of stock" : added ? "Added" : "Add to cart"}
            </button>
        </div>
    );
}
