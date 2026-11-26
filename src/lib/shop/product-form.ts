import { z } from "zod";
import { minorFromInput, type Currency } from "./money";

export type ProductField = "name" | "nameAr" | "description" | "descriptionAr" | "variants" | "categoryId" | "photoUrl";
export type ProductFieldCode = "required" | "long" | "price" | "stock" | "label" | "category" | "photo" | "photoLink" | "currency";

export type VariantDraft = {
    label: string;
    labelAr: string;
    price: string;
    stock?: string;
};

const nameLimit = 120;

export function variantListCode(variants: VariantDraft[], currency: Currency): ProductFieldCode | null {
    if (variants.length < 1) return "required";
    const named = variants.length > 1;
    for (const variant of variants) {
        const label = variant.label.trim();
        const labelAr = variant.labelAr.trim();
        if (label.length > 80 || labelAr.length > 80) return "long";
        if (named && (!label || !labelAr)) return "label";
        if (minorFromInput(variant.price, currency) == null) return "price";
        if (variant.stock != null && !/^\d+$/.test(variant.stock.trim())) return "stock";
    }
    return null;
}

export function productDraftErrors(
    input: {
        name: string;
        nameAr: string;
        description: string;
        descriptionAr: string;
        variants: VariantDraft[];
        categoryId: string;
        hasPhoto: boolean;
    },
    currency: Currency,
): Partial<Record<ProductField, ProductFieldCode>> {
    const errors: Partial<Record<ProductField, ProductFieldCode>> = {};
    const name = input.name.trim();
    const nameAr = input.nameAr.trim();
    if (!name) errors.name = "required";
    else if (name.length > nameLimit) errors.name = "long";
    if (!nameAr) errors.nameAr = "required";
    else if (nameAr.length > nameLimit) errors.nameAr = "long";
    const variants = variantListCode(input.variants, currency);
    if (variants) errors.variants = variants;
    if (!z.uuid().safeParse(input.categoryId).success) errors.categoryId = "category";
    if (!input.hasPhoto) errors.photoUrl = "photo";
    return errors;
}

export function productIssueCode(field: string, code: string): ProductFieldCode | null {
    if (field === "name" || field === "nameAr") return code === "too_big" ? "long" : "required";
    if (field === "variants") {
        if (code === "too_big") return "long";
        if (code === "too_small") return "required";
        return "price";
    }
    if (field === "categoryId") return "category";
    if (field === "photoUrl") return code === "too_big" ? "photoLink" : "photo";
    return null;
}
