"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmProductPhoto, deleteProduct, prepareProductPhoto, saveProduct } from "@/lib/actions/shop";
import { uploadToSignedUrl } from "@/lib/storage/direct-upload";
import type { Copy, Locale } from "@/lib/i18n";
import { shopText } from "@/lib/shop/catalog";
import { inputFromMinor, minorFromInput, type Currency } from "@/lib/shop/money";
import { productDraftErrors, type ProductField, type ProductFieldCode } from "@/lib/shop/product-form";
import ProductPhoto from "./ProductPhoto";
import { mapShopError } from "./ShopAdmin";

type Category = { id: string; name: string; nameAr: string };
type Version = { id: string; label: string; labelAr: string; price: number; stock: number };
type Product = {
    id: string;
    name: string;
    nameAr: string;
    description: string | null;
    descriptionAr: string | null;
    available: boolean;
    categoryId: string;
    photoUrl: string | null;
    variants: Version[];
};
type Draft = {
    key: string;
    id?: string;
    label: string;
    labelAr: string;
    price: string;
    stock: string;
};

function controlClass(invalid: boolean) {
    return `mt-1 w-full rounded-xl border px-3 py-2.5 text-sm dark:bg-stone-950 ${invalid ? "border-red-600 dark:border-red-400" : "border-stone-300 dark:border-stone-700"}`;
}

function explain(copy: Copy, field: ProductField, code: ProductFieldCode) {
    if (field === "name") return code === "long" ? copy.shopErrNameLong : copy.shopErrNameRequired;
    if (field === "nameAr") return code === "long" ? copy.shopErrNameArLong : copy.shopErrNameArRequired;
    if (field === "variants") {
        if (code === "currency") return copy.pricingErrCurrency;
        if (code === "label") return copy.shopErrVersionLabel;
        if (code === "long") return copy.shopErrVersionLong;
        if (code === "price") return copy.shopErrVersionPrice;
        if (code === "stock") return copy.shopErrVersionStock;
        return copy.shopErrVersions;
    }
    if (field === "categoryId") return copy.shopErrCategory;
    if (field === "photoUrl") return code === "photoLink" ? copy.shopErrPhoto : copy.shopPhotoRequired;
    return copy.shopErrDetails;
}

function messagesFor(codes: Partial<Record<ProductField, ProductFieldCode>>, copy: Copy) {
    const messages: Partial<Record<ProductField, string>> = {};
    for (const field of Object.keys(codes) as ProductField[]) {
        const code = codes[field];
        if (code) messages[field] = explain(copy, field, code);
    }
    return messages;
}

function showBeside(form: HTMLFormElement, fields: Partial<Record<ProductField, string>>) {
    const first = (Object.keys(fields) as ProductField[])[0];
    if (!first) return;
    const name = first === "photoUrl" ? "photo" : first;
    form.querySelector<HTMLElement>(`[name="${name}"]`)?.scrollIntoView({ block: "center" });
}

function blankVersion(): Draft {
    return { key: crypto.randomUUID(), label: "", labelAr: "", price: "", stock: "" };
}

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
    const [fields, setFields] = useState<Partial<Record<ProductField, string>>>({});
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [versions, setVersions] = useState<Draft[]>(() => product?.variants.length
        ? product.variants.map((variant) => ({
            key: variant.id,
            id: variant.id,
            label: variant.label,
            labelAr: variant.labelAr,
            price: inputFromMinor(variant.price, currency),
            stock: String(variant.stock),
        }))
        : [{ ...blankVersion(), key: "draft" }]);
    const currentPhoto = preview ?? (product ? productPhoto(product.id, product.photoUrl) : null);

    function productPhoto(id: string, photoUrl: string | null) {
        if (!photoUrl) return null;
        if (photoUrl.startsWith("/images/") || photoUrl.startsWith("https://")) return photoUrl;
        return `/shop/media/${id}`;
    }

    function changeVersion(key: string, patch: Partial<Draft>) {
        setVersions((current) => current.map((version) => version.key === key ? { ...version, ...patch } : version));
    }

    return (
        <form
            className="mt-6 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
            onInput={(event) => {
                const name = (event.target as HTMLInputElement).name;
                const field = (name === "photo" ? "photoUrl" : name.startsWith("variant") ? "variants" : name) as ProductField;
                setFields((current) => {
                    if (!current[field]) return current;
                    const next = { ...current };
                    delete next[field];
                    return next;
                });
            }}
            onSubmit={async (event) => {
                event.preventDefault();
                const formElement = event.currentTarget;
                const form = new FormData(formElement);
                const file = form.get("photo");
                const values = {
                    name: String(form.get("name") ?? ""),
                    nameAr: String(form.get("nameAr") ?? ""),
                    description: String(form.get("description") ?? ""),
                    descriptionAr: String(form.get("descriptionAr") ?? ""),
                    categoryId: String(form.get("categoryId") ?? ""),
                    variants: versions.map((version) => ({
                        label: version.label,
                        labelAr: version.labelAr,
                        price: version.price,
                        ...(version.id ? {} : { stock: version.stock }),
                    })),
                };
                setSaving(true);
                setError(null);
                const problems = productDraftErrors({
                    ...values,
                    hasPhoto: Boolean(product?.photoUrl) || (file instanceof File && file.size > 0),
                }, currency);
                if (Object.keys(problems).length > 0) {
                    const messages = messagesFor(problems, copy);
                    setFields(messages);
                    showBeside(formElement, messages);
                    setSaving(false);
                    return;
                }
                let photoUrl = product?.photoUrl ?? "";
                try {
                    if (file instanceof File && file.size > 0) {
                        const prepared = await prepareProductPhoto({ contentType: file.type, size: file.size });
                        if (!prepared.success) {
                            const messages = { photoUrl: mapShopError(prepared.formErrors[0], copy) };
                            setFields(messages);
                            showBeside(formElement, messages);
                            setSaving(false);
                            return;
                        }
                        await uploadToSignedUrl(prepared.signedUrl, file);
                        const confirmed = await confirmProductPhoto({ key: prepared.key, contentType: file.type });
                        if (!confirmed.success) {
                            const messages = { photoUrl: mapShopError(confirmed.formErrors[0], copy) };
                            setFields(messages);
                            showBeside(formElement, messages);
                            setSaving(false);
                            return;
                        }
                        photoUrl = confirmed.key;
                    }
                } catch {
                    const messages = { photoUrl: copy.shopErrPhotoFile };
                    setFields(messages);
                    showBeside(formElement, messages);
                    setSaving(false);
                    return;
                }
                const priced = versions.map((version) => {
                    const price = minorFromInput(version.price, currency);
                    return price == null ? null : {
                        ...(version.id ? { id: version.id } : { stock: Number(version.stock) }),
                        label: version.label.trim(),
                        labelAr: version.labelAr.trim(),
                        price,
                    };
                });
                if (priced.some((version) => version == null)) {
                    const messages = { variants: copy.shopErrVersionPrice };
                    setFields(messages);
                    showBeside(formElement, messages);
                    setSaving(false);
                    return;
                }
                const result = await saveProduct({
                    id: product?.id,
                    name: values.name,
                    nameAr: values.nameAr,
                    description: values.description,
                    descriptionAr: values.descriptionAr,
                    priceCurrency: currency,
                    variants: priced,
                    categoryId: values.categoryId,
                    available: form.get("available") === "on",
                    photoUrl,
                });
                setSaving(false);
                if (!result.success) {
                    if ("fieldErrors" in result && result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
                        const messages = messagesFor(result.fieldErrors, copy);
                        setFields(messages);
                        showBeside(formElement, messages);
                    }
                    if (result.formErrors[0]) setError(mapShopError(result.formErrors[0], copy));
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
                    aria-invalid={Boolean(fields.photoUrl)}
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        setPreview(file ? URL.createObjectURL(file) : null);
                    }}
                    className={`${controlClass(Boolean(fields.photoUrl))} file:me-3 file:rounded-full file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-emerald-900`}
                />
                <span className="mt-1 block text-xs font-normal text-stone-500">{copy.shopPhotoHint}</span>
                <FieldNote message={fields.photoUrl} />
            </label>
            <label className="text-sm font-medium">
                {copy.shopNameEn}
                <input name="name" defaultValue={product?.name} required aria-invalid={Boolean(fields.name)} className={controlClass(Boolean(fields.name))} />
                <FieldNote message={fields.name} />
            </label>
            <label className="text-sm font-medium">
                {copy.shopNameAr}
                <input name="nameAr" defaultValue={product?.nameAr} required dir="rtl" aria-invalid={Boolean(fields.nameAr)} className={controlClass(Boolean(fields.nameAr))} />
                <FieldNote message={fields.nameAr} />
            </label>
            <label className="text-sm font-medium">
                {copy.shopDescriptionEn}
                <textarea name="description" defaultValue={product?.description ?? ""} rows={3} aria-invalid={Boolean(fields.description)} className={controlClass(Boolean(fields.description))} />
                <FieldNote message={fields.description} />
            </label>
            <label className="text-sm font-medium">
                {copy.shopDescriptionAr}
                <textarea name="descriptionAr" defaultValue={product?.descriptionAr ?? ""} rows={3} dir="rtl" aria-invalid={Boolean(fields.descriptionAr)} className={controlClass(Boolean(fields.descriptionAr))} />
                <FieldNote message={fields.descriptionAr} />
            </label>
            <fieldset name="variants" className="flex flex-col gap-3 rounded-2xl border border-stone-200 p-3 dark:border-stone-700">
                <legend className="px-1 text-sm font-medium">{copy.shopVersions}</legend>
                <p className="text-xs font-normal text-stone-500">{copy.shopVersionHint}</p>
                {versions.map((version, index) => (
                    <div key={version.key} className="grid gap-3 rounded-2xl bg-stone-50 p-3 dark:bg-stone-950">
                        {versions.length > 1 && (
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">{index + 1}</p>
                                <button
                                    type="button"
                                    onClick={() => setVersions((current) => current.filter((item) => item.key !== version.key))}
                                    className="text-sm text-stone-500 underline decoration-stone-300 underline-offset-4 hover:text-emerald-900"
                                >
                                    {copy.shopRemove}
                                </button>
                            </div>
                        )}
                        <label className="text-sm font-medium">
                            {copy.shopVersionLabel}
                            <input name="variant-label" value={version.label} onChange={(event) => changeVersion(version.key, { label: event.target.value })} className={controlClass(Boolean(fields.variants))} />
                        </label>
                        <label className="text-sm font-medium">
                            {copy.shopVersionLabelAr}
                            <input name="variant-label-ar" value={version.labelAr} dir="rtl" onChange={(event) => changeVersion(version.key, { labelAr: event.target.value })} className={controlClass(Boolean(fields.variants))} />
                        </label>
                        <label className="text-sm font-medium">
                            {currency === "USD" ? copy.shopPriceUsd : copy.shopPriceLbp}
                            <input name="variant-price" inputMode="decimal" value={version.price} onChange={(event) => changeVersion(version.key, { price: event.target.value })} required aria-invalid={Boolean(fields.variants)} className={controlClass(Boolean(fields.variants))} />
                        </label>
                        {version.id ? (
                            <p className="text-sm text-stone-500">{copy.shopStockField}: {version.stock}</p>
                        ) : (
                            <label className="text-sm font-medium">
                                {copy.shopStockField}
                                <input name="variant-stock" type="number" min={0} value={version.stock} onChange={(event) => changeVersion(version.key, { stock: event.target.value })} required aria-invalid={Boolean(fields.variants)} className={controlClass(Boolean(fields.variants))} />
                            </label>
                        )}
                    </div>
                ))}
                <FieldNote message={fields.variants} />
                <button
                    type="button"
                    onClick={() => setVersions((current) => [...current, blankVersion()])}
                    className="self-start rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 dark:text-stone-100 dark:hover:bg-stone-800"
                >
                    {copy.shopAddVersion}
                </button>
            </fieldset>
            <label className="text-sm font-medium">
                {copy.shopManageCategories}
                <select name="categoryId" defaultValue={product?.categoryId ?? categories[0]?.id} required aria-invalid={Boolean(fields.categoryId)} className={controlClass(Boolean(fields.categoryId))}>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>{shopText(locale, category.name, category.nameAr)}</option>
                    ))}
                </select>
                <FieldNote message={fields.categoryId} />
            </label>
            <label className="flex items-center gap-2 text-sm">
                <input name="available" type="checkbox" defaultChecked={product?.available ?? true} />
                {copy.shopVisible}
            </label>
            {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
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

function FieldNote({ message }: { message?: string }) {
    if (!message) return null;
    return <span className="mt-1 block text-sm font-normal text-red-700 dark:text-red-300">{message}</span>;
}
