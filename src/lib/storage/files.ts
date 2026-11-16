/*
Rules for pet photos and medical documents.

This file does not talk to Supabase. The server checks these rules, then
supabase.ts signs a URL. The browser uploads or downloads the file directly.
*/

import { z } from "zod";

export const PET_PHOTOS_BUCKET = "pet-photos";
export const PRODUCT_PHOTOS_BUCKET = "product-photos";
export const MEDICAL_DOCUMENTS_BUCKET = "medical-documents";

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

// The extension is the one we write into the object path. The original filename is never kept.
export const PHOTO_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
} as const;

export const DOCUMENT_TYPES = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
} as const;

export type FileCheck = { ok: true; extension: string } | { ok: false; message: string };

const OBJECT_EXTENSIONS = ["jpg", "png", "webp", "gif", "pdf"];

function declaredFile(contentType: string, size: number, types: Record<string, string>, maxBytes: number, label: string): FileCheck {
    const extension = types[contentType];
    if (!extension) return { ok: false, message: `${label} must be ${Object.keys(types).join(", ")}.` };
    if (typeof size !== "number" || !Number.isInteger(size) || size <= 0 || size > maxBytes) {
        return { ok: false, message: `${label} must be under ${Math.floor(maxBytes / (1024 * 1024))} MB.` };
    }
    return { ok: true, extension };
}

// Called before the signed upload URL is created. The server has not seen the bytes yet.
export function preparePhoto(contentType: string, size: number) {
    return declaredFile(contentType, size, PHOTO_TYPES, PHOTO_MAX_BYTES, "A photo");
}

export function prepareDocument(contentType: string, size: number) {
    return declaredFile(contentType, size, DOCUMENT_TYPES, DOCUMENT_MAX_BYTES, "A document");
}

function ascii(bytes: Uint8Array, start: number, text: string) {
    return text.split("").every((character, index) => bytes[start + index] === character.charCodeAt(0));
}

// The browser-supplied type is not enough. The first bytes have to match that type.
function signatureMatches(contentType: string, bytes: Uint8Array) {
    if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (contentType === "image/png") return bytes[0] === 0x89 && ascii(bytes, 1, "PNG");
    if (contentType === "image/gif") return ascii(bytes, 0, "GIF87a") || ascii(bytes, 0, "GIF89a");
    if (contentType === "image/webp") return ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP");
    if (contentType === "application/pdf") return ascii(bytes, 0, "%PDF");
    return false;
}

// Called after the browser upload, using the object's real size and its first bytes.
export function acceptPhoto(contentType: string, size: number, prefix: Uint8Array): FileCheck {
    const declared = preparePhoto(contentType, size);
    if (!declared.ok) return declared;
    if (!signatureMatches(contentType, prefix)) return { ok: false, message: "That file is not a valid photo." };
    return declared;
}

export function acceptDocument(contentType: string, size: number, prefix: Uint8Array): FileCheck {
    const declared = prepareDocument(contentType, size);
    if (!declared.ok) return declared;
    if (!signatureMatches(contentType, prefix)) return { ok: false, message: "That file is not a valid document." };
    return declared;
}

// <pet id>/<random id>.<extension>. The browser never chooses this path.
export function objectKey(petId: string, extension: string) {
    const id = petId.toLowerCase();
    if (!z.uuid().safeParse(id).success) throw new Error("That pet was not found.");
    if (!OBJECT_EXTENSIONS.includes(extension)) throw new Error("That file type is not supported.");
    return `${id}/${crypto.randomUUID()}.${extension}`;
}

export function isSafeObjectKey(key: string) {
    return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|gif|pdf)$/.test(key);
}

export function isPetObjectKey(petId: string, key: string, extension: string) {
    return isSafeObjectKey(key) && key.startsWith(`${petId.toLowerCase()}/`) && key.endsWith(`.${extension}`);
}

// The img tag points at our route. That route checks the session, then redirects to a signed download URL.
export function petPhotoSrc(petId: string, photoUrl: string | null | undefined) {
    if (!photoUrl || !isSafeObjectKey(photoUrl)) return null;
    return `/pets/${petId}/photo`;
}

export function productPhotoSrc(productId: string, photoUrl: string | null | undefined) {
    if (!photoUrl) return null;
    if (photoUrl.startsWith("/images/") || photoUrl.startsWith("https://")) return photoUrl;
    if (isSafeObjectKey(photoUrl)) return `/shop/media/${productId}`;
    return null;
}
