"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory, saveCategory } from "@/lib/actions/shop";
import type { Copy } from "@/lib/i18n";
import { mapShopError } from "./ShopAdmin";

type Category = { id: string; name: string; nameAr: string };

const field = "mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-950";

export default function CategoryForm({ copy, category }: { copy: Copy; category?: Category }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    return (
        <form
            className="mt-6 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                setSaving(true);
                setError(null);
                const result = await saveCategory({
                    id: category?.id,
                    name: String(form.get("name") ?? ""),
                    nameAr: String(form.get("nameAr") ?? ""),
                });
                setSaving(false);
                if (!result.success) {
                    setError(mapShopError(result.formErrors[0], copy));
                    return;
                }
                router.push("/admin/shop/categories");
                router.refresh();
            }}
        >
            <label className="text-sm font-medium">
                {copy.shopNameEn}
                <input name="name" defaultValue={category?.name} required className={field} />
            </label>
            <label className="text-sm font-medium">
                {copy.shopNameAr}
                <input name="nameAr" defaultValue={category?.nameAr} required dir="rtl" className={field} />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving} className="rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                    {saving ? copy.profileSaving : copy.shopSaveProduct}
                </button>
                {category && (
                    <button
                        type="button"
                        onClick={async () => {
                            const result = await deleteCategory(category.id);
                            if (!result.success) {
                                setError(mapShopError(result.formErrors[0], copy));
                                return;
                            }
                            router.push("/admin/shop/categories");
                            router.refresh();
                        }}
                        className="rounded-full border border-stone-300 px-5 py-2.5 text-sm hover:bg-stone-50"
                    >
                        {copy.shopDeleteProduct}
                    </button>
                )}
            </div>
        </form>
    );
}
