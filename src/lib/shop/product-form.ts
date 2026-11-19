import { z } from "zod";
import { minorFromInput, type Currency } from "./money";

export type ProductField = "name" | "nameAr" | "description" | "descriptionAr" | "price" | "stock" | "categoryId" | "photoUrl";
export type ProductFieldCode = "required" | "long" | "price" | "stock" | "category" | "photo" | "photoLink" | "currency";

const nameLimit = 120;

export function productDraftErrors(
    input: {
        name: string;
        nameAr: string;
        description: string;
        descriptionAr: string;
        price: string;
        stock?: string;
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
    if (minorFromInput(input.price, currency) == null) errors.price = "price";
    if (input.stock != null && !/^\d+$/.test(input.stock.trim())) errors.stock = "stock";
    if (!z.uuid().safeParse(input.categoryId).success) errors.categoryId = "category";
    if (!input.hasPhoto) errors.photoUrl = "photo";
    return errors;
}

export function productIssueCode(field: string, code: string): ProductFieldCode | null {
    if (field === "name" || field === "nameAr") return code === "too_big" ? "long" : "required";
    if (field === "price") return "price";
    if (field === "stock") return "stock";
    if (field === "categoryId") return "category";
    if (field === "photoUrl") return code === "too_big" ? "photoLink" : "photo";
    return null;
}
