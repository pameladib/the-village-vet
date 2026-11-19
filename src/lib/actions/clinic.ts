"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { convertMinor } from "@/lib/shop/money";
import { pricingFrom } from "@/lib/shop/pricing";
import {
    CLINIC_PHOTOS_BUCKET,
    PHOTO_TYPES,
    acceptPhoto,
    isSafeObjectKey,
    objectKey,
    preparePhoto,
} from "@/lib/storage/files";
import { StorageNotConfiguredError, createUploadUrl, ensurePrivateBucket, readStoredPrefix, removeStoredObject } from "@/lib/storage/supabase";

const CLINIC_FOLDER = "c11c1c00-1111-4111-8111-000000000001";
const GALLERY_LIMIT = 8;
const photoKinds = ["HERO", "ABOUT", "GALLERY"] as const;

const settingsSchema = z.object({
    phone: z.string().trim().max(40).optional(),
    whatsapp: z.string().trim().max(40).optional(),
    email: z.string().trim().max(200).optional(),
    address: z.string().trim().max(300).optional(),
    mapsUrl: z.string().trim().max(500).optional(),
    about: z.string().trim().max(2000).optional(),
});

function emptyToNull(value: string | undefined) {
    return value ? value : null;
}

export async function saveClinicSettings(input: unknown) {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        return { success: false as const, formErrors: ["Only the veterinarian can edit the clinic page."] };
    }

    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Check the clinic details."] };
    if (parsed.data.mapsUrl && !parsed.data.mapsUrl.startsWith("https://")) {
        return { success: false as const, formErrors: ["The map link must start with https://."] };
    }
    const email = emptyToNull(parsed.data.email);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false as const, formErrors: ["Enter a valid email address."] };
    }

    await prisma.clinicSetting.upsert({
        where: { id: "clinic" },
        update: {
            phone: emptyToNull(parsed.data.phone),
            whatsapp: emptyToNull(parsed.data.whatsapp),
            email,
            address: emptyToNull(parsed.data.address),
            mapsUrl: emptyToNull(parsed.data.mapsUrl),
            about: emptyToNull(parsed.data.about),
        },
        create: {
            id: "clinic",
            phone: emptyToNull(parsed.data.phone),
            whatsapp: emptyToNull(parsed.data.whatsapp),
            email,
            address: emptyToNull(parsed.data.address),
            mapsUrl: emptyToNull(parsed.data.mapsUrl),
            about: emptyToNull(parsed.data.about),
        },
    });

    revalidatePath("/", "layout");
    return { success: true as const };
}

const pricingSchema = z.object({
    currency: z.enum(["USD", "LBP"]),
    rate: z.number().int().min(1).max(10_000_000),
});

export async function savePricing(input: unknown) {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        return { success: false as const, formErrors: ["Only the veterinarian can edit the clinic page."] };
    }
    const parsed = pricingSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Enter a whole number of Lebanese pounds for 1 USD."] };

    const converted = await prisma.$transaction(async (tx) => {
        const current = pricingFrom(await tx.clinicSetting.findUnique({
            where: { id: "clinic" },
            select: { priceCurrency: true, usdRate: true },
        }));
        let changedPrices = false;
        if (current.currency !== parsed.data.currency) {
            const products = await tx.product.findMany({ select: { id: true, price: true } });
            for (const product of products) {
                const price = convertMinor(product.price, current.currency, parsed.data.currency, parsed.data.rate);
                if (price == null) throw new Error("rate");
                await tx.product.update({ where: { id: product.id }, data: { price } });
            }
            changedPrices = products.length > 0;
        }
        await tx.clinicSetting.upsert({
            where: { id: "clinic" },
            update: { priceCurrency: parsed.data.currency, usdRate: parsed.data.rate },
            create: { id: "clinic", priceCurrency: parsed.data.currency, usdRate: parsed.data.rate },
        });
        return changedPrices;
    });

    revalidatePath("/", "layout");
    revalidatePath("/shop");
    revalidatePath("/admin/shop");
    return { success: true as const, converted: converted };
}

function refreshPhotos() {
    revalidatePath("/", "layout");
    revalidatePath("/about");
    revalidatePath("/admin/homepage");
}

async function veterinarian() {
    try {
        await requireRole(["ADMIN"]);
        return true;
    } catch {
        return false;
    }
}

export async function prepareClinicPhoto(input: { contentType: string; size: number }) {
    if (!(await veterinarian())) return { success: false as const, formErrors: ["Only the veterinarian can edit the clinic page."] };
    const check = preparePhoto(input.contentType, input.size);
    if (!check.ok) return { success: false as const, formErrors: [check.message] };
    const extension = PHOTO_TYPES[input.contentType as keyof typeof PHOTO_TYPES];
    try {
        await ensurePrivateBucket(CLINIC_PHOTOS_BUCKET);
        const key = objectKey(CLINIC_FOLDER, extension);
        const signedUrl = await createUploadUrl(CLINIC_PHOTOS_BUCKET, key);
        return { success: true as const, key, signedUrl };
    } catch (error) {
        if (error instanceof StorageNotConfiguredError) return { success: false as const, formErrors: [error.message] };
        return { success: false as const, formErrors: ["Could not prepare the upload."] };
    }
}

async function storedClinicPhoto(key: string, contentType: string) {
    const extension = PHOTO_TYPES[contentType as keyof typeof PHOTO_TYPES];
    if (!extension || !isSafeObjectKey(key) || !key.startsWith(`${CLINIC_FOLDER}/`) || !key.endsWith(`.${extension}`)) return "Could not store the photo.";
    const stored = await readStoredPrefix(CLINIC_PHOTOS_BUCKET, key);
    if (!stored || (stored.contentType && stored.contentType !== contentType)) {
        if (stored) await removeStoredObject(CLINIC_PHOTOS_BUCKET, key).catch(() => undefined);
        return "Could not store the photo.";
    }
    const accepted = acceptPhoto(contentType, stored.size, stored.prefix);
    if (!accepted.ok) {
        await removeStoredObject(CLINIC_PHOTOS_BUCKET, key).catch(() => undefined);
        return accepted.message;
    }
    return null;
}

const clinicPhotoSchema = z.object({
    id: z.uuid().optional(),
    kind: z.enum(photoKinds),
    captionEn: z.string().trim().max(160).optional(),
    captionAr: z.string().trim().max(160).optional(),
    storageKey: z.string().optional(),
    contentType: z.string().optional(),
});

export async function saveClinicPhoto(input: unknown) {
    if (!(await veterinarian())) return { success: false as const, formErrors: ["Only the veterinarian can edit the clinic page."] };
    const parsed = clinicPhotoSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Check the picture and captions."] };
    if (parsed.data.kind === "GALLERY" && (!parsed.data.captionEn || !parsed.data.captionAr)) {
        return { success: false as const, formErrors: ["Enter the caption in English and Arabic."] };
    }

    const key = parsed.data.storageKey || undefined;
    if (key) {
        try {
            const problem = await storedClinicPhoto(key, parsed.data.contentType ?? "");
            if (problem) return { success: false as const, formErrors: [problem] };
        } catch (error) {
            if (key) await removeStoredObject(CLINIC_PHOTOS_BUCKET, key).catch(() => undefined);
            if (error instanceof StorageNotConfiguredError) return { success: false as const, formErrors: [error.message] };
            return { success: false as const, formErrors: ["Could not store the photo."] };
        }
        const taken = await prisma.clinicPhoto.findFirst({ where: { storageKey: key, NOT: parsed.data.id ? { id: parsed.data.id } : undefined }, select: { id: true } });
        if (taken) return { success: false as const, formErrors: ["Could not store the photo."] };
    }

    try {
        if (parsed.data.kind === "GALLERY") {
            if (parsed.data.id) {
                const current = await prisma.clinicPhoto.findFirst({ where: { id: parsed.data.id, kind: "GALLERY" } });
                if (!current) return { success: false as const, formErrors: ["That picture was not found."] };
                await prisma.clinicPhoto.update({
                    where: { id: current.id },
                    data: {
                        ...(parsed.data.captionEn != null ? { captionEn: parsed.data.captionEn } : {}),
                        ...(parsed.data.captionAr != null ? { captionAr: parsed.data.captionAr } : {}),
                        ...(key ? { storageKey: key } : {}),
                    },
                });
                if (key && key !== current.storageKey) await removeStoredObject(CLINIC_PHOTOS_BUCKET, current.storageKey).catch(() => undefined);
            } else {
                if (!key) return { success: false as const, formErrors: ["Choose a picture to upload."] };
                const count = await prisma.clinicPhoto.count({ where: { kind: "GALLERY" } });
                if (count >= GALLERY_LIMIT) {
                    await removeStoredObject(CLINIC_PHOTOS_BUCKET, key).catch(() => undefined);
                    return { success: false as const, formErrors: ["The carousel can hold 8 pictures."] };
                }
                const last = await prisma.clinicPhoto.aggregate({ where: { kind: "GALLERY" }, _max: { position: true } });
                await prisma.clinicPhoto.create({
                    data: {
                        kind: "GALLERY",
                        position: (last._max.position ?? 0) + 1,
                        storageKey: key,
                        captionEn: parsed.data.captionEn ?? "",
                        captionAr: parsed.data.captionAr ?? "",
                    },
                });
            }
        } else {
            if (!key) return { success: false as const, formErrors: ["Choose a picture to upload."] };
            const current = await prisma.clinicPhoto.findFirst({ where: { kind: parsed.data.kind } });
            if (current) {
                await prisma.clinicPhoto.update({
                    where: { id: current.id },
                    data: { storageKey: key, captionEn: "", captionAr: "" },
                });
                if (key !== current.storageKey) await removeStoredObject(CLINIC_PHOTOS_BUCKET, current.storageKey).catch(() => undefined);
            } else {
                await prisma.clinicPhoto.create({
                    data: {
                        kind: parsed.data.kind,
                        storageKey: key,
                        captionEn: "",
                        captionAr: "",
                    },
                });
            }
        }
    } catch {
        if (key) await removeStoredObject(CLINIC_PHOTOS_BUCKET, key).catch(() => undefined);
        return { success: false as const, formErrors: ["Could not save this picture."] };
    }

    refreshPhotos();
    return { success: true as const };
}

export async function deleteClinicPhoto(id: string) {
    if (!(await veterinarian())) return { success: false as const, formErrors: ["Only the veterinarian can edit the clinic page."] };
    if (!z.uuid().safeParse(id).success) return { success: false as const, formErrors: ["That picture was not found."] };
    const current = await prisma.clinicPhoto.findUnique({ where: { id } });
    if (!current) return { success: false as const, formErrors: ["That picture was not found."] };
    await prisma.clinicPhoto.delete({ where: { id } });
    if (isSafeObjectKey(current.storageKey)) await removeStoredObject(CLINIC_PHOTOS_BUCKET, current.storageKey).catch(() => undefined);
    refreshPhotos();
    return { success: true as const };
}

export async function moveClinicPhoto(id: string, direction: -1 | 1) {
    if (!(await veterinarian())) return { success: false as const, formErrors: ["Only the veterinarian can edit the clinic page."] };
    if (!z.uuid().safeParse(id).success) return { success: false as const, formErrors: ["That picture was not found."] };
    const slides = await prisma.clinicPhoto.findMany({ where: { kind: "GALLERY" }, orderBy: { position: "asc" } });
    const index = slides.findIndex((slide) => slide.id === id);
    const neighbor = slides[index + direction];
    const current = slides[index];
    if (!current || !neighbor) return { success: true as const };
    await prisma.$transaction([
        prisma.clinicPhoto.update({ where: { id: current.id }, data: { position: neighbor.position } }),
        prisma.clinicPhoto.update({ where: { id: neighbor.id }, data: { position: current.position } }),
    ]);
    refreshPhotos();
    return { success: true as const };
}
