"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct, saveProduct, setOrderStatus } from "@/lib/actions/shop";

type Category = { id: string; name: string };
type Product = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    available: boolean;
    categoryId: string;
};

const field = "rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950";

export function ProductForm({ categories, product }: { categories: Category[]; product?: Product }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    return (
        <form
            className="flex flex-col gap-2 rounded-2xl border border-emerald-100 p-3 dark:border-emerald-900"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const result = await saveProduct({
                    id: product?.id,
                    name: String(form.get("name") ?? ""),
                    description: String(form.get("description") ?? ""),
                    price: Number(form.get("price")),
                    stock: Number(form.get("stock")),
                    categoryId: String(form.get("categoryId") ?? ""),
                    available: form.get("available") === "on",
                });
                if (!result.success) {
                    setError(result.formErrors[0] ?? "Could not save the product.");
                    return;
                }
                setError(null);
                if (!product) event.currentTarget.reset();
                router.refresh();
            }}
        >
            <input name="name" defaultValue={product?.name} placeholder="Name" required className={field} />
            <input name="description" defaultValue={product?.description ?? ""} placeholder="Description" className={field} />
            <input name="price" type="number" min={0} defaultValue={product?.price ?? 0} required className={field} aria-label="Price in Lebanese pounds" />
            <input name="stock" type="number" min={0} defaultValue={product?.stock ?? 0} required className={field} aria-label="Stock" />
            <select name="categoryId" defaultValue={product?.categoryId ?? categories[0]?.id} className={field}>
                {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
                <input name="available" type="checkbox" defaultChecked={product?.available ?? true} />
                Visible in the shop
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex gap-2">
                <button type="submit" className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white">Save</button>
                {product && (
                    <button
                        type="button"
                        onClick={async () => {
                            const result = await deleteProduct(product.id);
                            if (!result.success) setError(result.formErrors[0] ?? "Could not delete the product.");
                            else router.refresh();
                        }}
                        className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    >
                        Delete
                    </button>
                )}
            </div>
        </form>
    );
}

export function OrderActions({ orderId, status }: { orderId: string; status: string }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    async function update(next: "APPROVED" | "REJECTED" | "FULFILLED") {
        const result = await setOrderStatus(orderId, next);
        if (!result.success) setError(result.formErrors[0] ?? "Could not update the order.");
        else router.refresh();
    }

    if (status === "REJECTED" || status === "FULFILLED") return <p className="text-xs text-stone-500">{status}</p>;

    return (
        <div className="flex flex-wrap gap-2">
            {status === "PENDING" && <button type="button" onClick={() => update("APPROVED")} className="rounded-lg bg-emerald-800 px-2.5 py-1.5 text-xs font-medium text-white">Approve</button>}
            {status === "APPROVED" && <button type="button" onClick={() => update("FULFILLED")} className="rounded-lg bg-emerald-800 px-2.5 py-1.5 text-xs font-medium text-white">Fulfil</button>}
            <button type="button" onClick={() => update("REJECTED")} className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs">Reject</button>
            {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
    );
}
