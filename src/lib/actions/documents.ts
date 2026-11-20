"use server";

import { z } from "zod";
import { revalidatePet } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { canUploadMedicalDocument } from "@/lib/auth/permissions";
import {
    acceptDocument,
    DOCUMENT_TYPES,
    isPetObjectKey,
    MEDICAL_DOCUMENTS_BUCKET,
    objectKey,
    prepareDocument,
} from "@/lib/storage/files";
import { createUploadUrl, ensurePrivateBucket, readStoredPrefix, removeStoredObject, StorageNotConfiguredError } from "@/lib/storage/supabase";

type Failure = { success: false; formErrors: string[] };

async function editablePet(petId: string): Promise<{ petId: string } | Failure> {
    let session;
    try {
        session = await requireRole(["ADMIN", "OWNER"]);
    } catch {
        return { success: false, formErrors: ["You cannot add documents for this pet."] };
    }
    if (!z.uuid().safeParse(petId).success) return { success: false, formErrors: ["That pet was not found."] };
    try {
        const pet = await prisma.pet.findUnique({ where: { id: petId }, select: { id: true, ownerId: true } });
        if (!pet || !canUploadMedicalDocument(session.user.role, session.user.id, pet.ownerId)) {
            return { success: false, formErrors: ["You cannot add documents for this pet."] };
        }
        return { petId: pet.id };
    } catch {
        return { success: false, formErrors: ["Could not save the document."] };
    }
}

function titleOf(value: string) {
    const title = value.trim();
    if (title.length === 0 || title.length > 120) return null;
    return title;
}

export async function prepareMedicalDocumentUpload(petId: string, input: { title: string; contentType: string; size: number }) {
    const allowed = await editablePet(petId);
    if ("success" in allowed) return allowed;
    const title = titleOf(input.title);
    if (!title) return { success: false as const, formErrors: ["Add a title and a PDF or image under 10 MB."] };

    const check = prepareDocument(input.contentType, input.size);
    if (!check.ok) return { success: false as const, formErrors: [check.message] };

    try {
        const key = objectKey(allowed.petId, check.extension);
        await ensurePrivateBucket(MEDICAL_DOCUMENTS_BUCKET);
        const signedUrl = await createUploadUrl(MEDICAL_DOCUMENTS_BUCKET, key);
        return { success: true as const, key, signedUrl };
    } catch (error) {
        if (error instanceof StorageNotConfiguredError) return { success: false as const, formErrors: [error.message] };
        return { success: false as const, formErrors: ["Could not prepare the upload."] };
    }
}

export async function confirmMedicalDocument(petId: string, input: { title: string; key: string; contentType: string }) {
    const allowed = await editablePet(petId);
    if ("success" in allowed) return allowed;
    const title = titleOf(input.title);
    if (!title) return { success: false as const, formErrors: ["Add a title and a PDF or image under 10 MB."] };

    const extension = DOCUMENT_TYPES[input.contentType as keyof typeof DOCUMENT_TYPES];
    if (!extension || !isPetObjectKey(allowed.petId, input.key, extension)) {
        return { success: false as const, formErrors: ["Could not save the document."] };
    }

    let saved = false;
    try {
        const stored = await readStoredPrefix(MEDICAL_DOCUMENTS_BUCKET, input.key);
        if (!stored || (stored.contentType && stored.contentType !== input.contentType)) {
            if (stored) await removeStoredObject(MEDICAL_DOCUMENTS_BUCKET, input.key).catch(() => undefined);
            return { success: false as const, formErrors: ["Could not save the document."] };
        }
        const accepted = acceptDocument(input.contentType, stored.size, stored.prefix);
        if (!accepted.ok) {
            await removeStoredObject(MEDICAL_DOCUMENTS_BUCKET, input.key).catch(() => undefined);
            return { success: false as const, formErrors: [accepted.message] };
        }

        const existing = await prisma.medicalDocument.findFirst({ where: { storedName: input.key }, select: { id: true } });
        if (existing) return { success: false as const, formErrors: ["Could not save the document."] };

        await prisma.medicalDocument.create({
            data: { petId: allowed.petId, title, storedName: input.key, contentType: input.contentType },
        });
        saved = true;
    } catch (error) {
        if (!saved) await removeStoredObject(MEDICAL_DOCUMENTS_BUCKET, input.key).catch(() => undefined);
        if (error instanceof StorageNotConfiguredError) return { success: false as const, formErrors: [error.message] };
        return { success: false as const, formErrors: ["Could not save the document."] };
    }

    await revalidatePet(allowed.petId);
    return { success: true as const };
}
