"use server";

import { z } from "zod";
import { revalidatePet } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { canChangePetPhoto } from "@/lib/auth/permissions";
import {
    acceptPhoto,
    isPetObjectKey,
    PET_PHOTOS_BUCKET,
    PHOTO_TYPES,
    isSafeObjectKey,
    objectKey,
    preparePhoto,
} from "@/lib/storage/files";
import { createUploadUrl, readStoredPrefix, removeStoredObject, StorageNotConfiguredError } from "@/lib/storage/supabase";

type Failure = { success: false; formErrors: string[] };

async function editablePet(petId: string): Promise<{ petId: string; photoUrl: string | null; ownerId: string | null } | Failure> {
    let session;
    try {
        session = await requireRole(["ADMIN", "OWNER"]);
    } catch (error) {
        if (error instanceof Error && error.message === "User is not authenticated") {
            return { success: false, formErrors: ["You need to sign in."] };
        }
        return { success: false, formErrors: ["You cannot change this photo."] };
    }
    if (!canChangePetPhoto(session.user.role)) {
        return { success: false, formErrors: ["You cannot change this photo."] };
    }
    if (!z.uuid().safeParse(petId).success) return { success: false, formErrors: ["That pet was not found."] };

    const pet = await prisma.pet.findUnique({ where: { id: petId }, select: { id: true, ownerId: true, photoUrl: true } });
    if (!pet) return { success: false, formErrors: ["That pet was not found."] };
    if (session.user.role === "OWNER" && pet.ownerId !== session.user.id) {
        return { success: false, formErrors: ["You cannot change this photo."] };
    }
    return {
        petId: pet.id,
        photoUrl: pet.photoUrl,
        ownerId: session.user.role === "OWNER" ? session.user.id : null,
    };
}

export async function preparePetPhotoUpload(petId: string, input: { contentType: string; size: number }) {
    const allowed = await editablePet(petId);
    if ("success" in allowed) return allowed;

    const check = preparePhoto(input.contentType, input.size);
    if (!check.ok) return { success: false as const, formErrors: [check.message] };

    try {
        const key = objectKey(allowed.petId, check.extension);
        const signedUrl = await createUploadUrl(PET_PHOTOS_BUCKET, key);
        return { success: true as const, key, signedUrl };
    } catch (error) {
        if (error instanceof StorageNotConfiguredError) return { success: false as const, formErrors: [error.message] };
        return { success: false as const, formErrors: ["Could not prepare the upload."] };
    }
}

export async function confirmPetPhoto(petId: string, input: { key: string; contentType: string }) {
    const allowed = await editablePet(petId);
    if ("success" in allowed) return allowed;

    const extension = PHOTO_TYPES[input.contentType as keyof typeof PHOTO_TYPES];
    if (!extension || !isPetObjectKey(allowed.petId, input.key, extension)) {
        return { success: false as const, formErrors: ["Could not store the photo."] };
    }

    let saved = false;
    try {
        const stored = await readStoredPrefix(PET_PHOTOS_BUCKET, input.key);
        if (!stored || (stored.contentType && stored.contentType !== input.contentType)) {
            if (stored) await removeStoredObject(PET_PHOTOS_BUCKET, input.key).catch(() => undefined);
            return { success: false as const, formErrors: ["Could not store the photo."] };
        }
        const accepted = acceptPhoto(input.contentType, stored.size, stored.prefix);
        if (!accepted.ok) {
            await removeStoredObject(PET_PHOTOS_BUCKET, input.key).catch(() => undefined);
            return { success: false as const, formErrors: [accepted.message] };
        }

        const updated = await prisma.pet.updateMany({
            where: allowed.ownerId ? { id: allowed.petId, ownerId: allowed.ownerId } : { id: allowed.petId },
            data: { photoUrl: input.key },
        });
        if (updated.count !== 1) {
            await removeStoredObject(PET_PHOTOS_BUCKET, input.key).catch(() => undefined);
            return { success: false as const, formErrors: ["We couldn't find this pet."] };
        }
        saved = true;

        const previous = allowed.photoUrl;
        if (previous && isSafeObjectKey(previous) && previous !== input.key) {
            await removeStoredObject(PET_PHOTOS_BUCKET, previous).catch(() => undefined);
        }
    } catch (error) {
        if (!saved) await removeStoredObject(PET_PHOTOS_BUCKET, input.key).catch(() => undefined);
        if (error instanceof StorageNotConfiguredError) return { success: false as const, formErrors: [error.message] };
        return { success: false as const, formErrors: ["Could not store the photo."] };
    }

    await revalidatePet(allowed.petId);
    return { success: true as const };
}
