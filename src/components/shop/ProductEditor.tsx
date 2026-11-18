"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmProductPhoto, deleteProduct, prepareProductPhoto, saveProduct } from "@/lib/actions/shop";
import { uploadToSignedUrl } from "@/lib/storage/direct-upload";
import type { Copy, Locale } from "@/lib/i18n";
import { shopText } from "@/lib/shop/catalog";
import { inputFromMinor, minorFromInput, type Currency } from "@/lib/shop/money";
import ProductPhoto from "./ProductPhoto";
import { mapShopError } from "./ShopAdmin";

type Category = { id: string; name: string; nameAr: string };
type Product = {
    id: string;
    name: string;
    nameAr: string;
    description: string | null;
    descriptionAr: string | null;
    price: number;
    stock: number;
    available: boolean;
    categoryId: string;
    photoUrl: string | null;
};

const field = "mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-950";

export default function ProductEditor({
    copy,
    locale,
    categories,
    product,
    currency,
}: {
    copy: Copy;
    locale: Locale;
    categories: Category[];
    product?: Product;
    currency: Currency;
}) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const currentPhoto = preview ?? (product ? productPhoto(product.id, product.photoUrl) : null);

    function productPhoto(id: string, photoUrl: string | null) {
        if (!photoUrl) return null;
        if (photoUrl.startsWith("/images/") || photoUrl.startsWith("https://")) return photoUrl;
        return `/shop/media/${id}`;
    }

    return (
        <form
            className="mt-6 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const file = form.get("photo");
                setSaving(true);
                setError(null);
                let photoUrl = product?.photoUrl ?? "";
                try {
                    if (file instanceof File && file.size > 0) {
                        const prepared = await prepareProductPhoto({ contentType: file.type, size: file.size });
                        if (!prepared.success) {
                            setError(mapShopError(prepared.formErrors[0], copy));
                            setSaving(false);
                            return;
                        }
                        await uploadToSignedUrl(prepared.signedUrl, file);
                        const confirmed = await confirmProductPhoto({ key: prepared.key, contentType: file.type });
                        if (!confirmed.success) {
                            setError(mapShopError(confirmed.formErrors[0], copy));
                            setSaving(false);
                            return;
                        }
                        photoUrl = confirmed.key;
                    }
                } catch {
                    setError(copy.shopErrPhotoFile);
                    setSaving(false);
                    return;
                }
                if (!photoUrl) {
                    setError(copy.shopPhotoRequired);
                    setSaving(false);
                    return;
                }
                const price = minorFromInput(String(form.get("price") ?? ""), currency);
                if (price == null) {
                    setError(copy.shopErrPrice);
                    setSaving(false);
                    return;
                }
                const result = await saveProduct({
                    id: product?.id,
                    name: String(form.get("name") ?? ""),
                    nameAr: String(form.get("nameAr") ?? ""),
                    description: String(form.get("description") ?? ""),
                    descriptionAr: String(form.get("descriptionAr") ?? ""),
                    price,
                    priceCurrency: currency,
                    stock: Number(form.get("stock")),
                    categoryId: String(form.get("categoryId") ?? ""),
                    available: form.get("available") === "on",
                    photoUrl,
                });
                setSaving(false);
                if (!result.success) {
                    setError(mapShopError(result.formErrors[0], copy));
                    return;
                }
                router.push("/admin/shop");
                router.refresh();
            }}
        >
            <div className="relative aspect-square w-full max-w-48 overflow-hidden rounded-2xl bg-[#efe8dc]">
                <ProductPhoto src={currentPhoto} alt="" sizes="12rem" />
            </div>
            <label className="text-sm font-medium">
                {copy.shopPhoto}
                <input
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    required={!product?.photoUrl}
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        setPreview(file ? URL.createObjectURL(file) : null);
                    }}
                    className={`${field} file:me-3 file:rounded-full file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-emerald-900`}
                />
                <span className="mt-1 block text-xs font-normal text-stone-500">{copy.shopPhotoHint}</span>
            </label>
            <label className="text-sm font-medium">
                {copy.shopNameEn}
                <input name="name" defaultValue={product?.name} required className={field} />
            </label>
            <label className="text-sm font-medium">
                {copy.shopNameAr}
                <input name="nameAr" defaultValue={product?.nameAr} required dir="rtl" className={field} />
            </label>
            <label className="text-sm font-medium">
                {copy.shopDescriptionEn}
                <textarea name="description" defaultValue={product?.description ?? ""} rows={3} className={field} />
            </label>
            <label className="text-sm font-medium">
                {copy.shopDescriptionAr}
                <textarea name="descriptionAr" defaultValue={product?.descriptionAr ?? ""} rows={3} dir="rtl" className={field} />
            </label>
            <label className="text-sm font-medium">
                {currency === "USD" ? copy.shopPriceUsd : copy.shopPriceLbp}
                <input name="price" inputMode="decimal" defaultValue={product ? inputFromMinor(product.price, currency) : ""} required className={field} />
            </label>
            <label className="text-sm font-medium">
                {copy.shopStockField}
                <input name="stock" type="number" min={0} defaultValue={product?.stock ?? 0} required className={field} />
            </label>
            <label className="text-sm font-medium">
                {copy.shopManageCategories}
                <select name="categoryId" defaultValue={product?.categoryId ?? categories[0]?.id} required className={field}>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>{shopText(locale, category.name, category.nameAr)}</option>
                    ))}
                </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
                <input name="available" type="checkbox" defaultChecked={product?.available ?? true} />
                {copy.shopVisible}
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving} className="rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                    {saving ? copy.profileSaving : copy.shopSaveProduct}
                </button>
                {product && (
                    <button
                        type="button"
                        disabled={saving}
                        onClick={async () => {
                            setSaving(true);
                            setError(null);
                            const result = await deleteProduct(product.id);
                            setSaving(false);
                            if (!result.success) {
                                setError(mapShopError(result.formErrors[0], copy));
                                return;
                            }
                            router.push("/admin/shop");
                            router.refresh();
                        }}
                        className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-800 transition duration-200 hover:bg-stone-50 disabled:opacity-60"
                    >
                        {copy.shopDeleteProduct}
                    </button>
                )}
            </div>
        </form>
    );
}
