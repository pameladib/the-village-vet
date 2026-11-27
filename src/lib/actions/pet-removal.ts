"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canManagePetLifecycle, canPermanentlyDeletePet } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { revalidatePet } from "@/lib/paths";
import { historyRelations, petHasHistory, petStorageObjects } from "@/lib/pets/removal";
import { canRestoreArchivedPet } from "@/lib/pets/status";
import { prisma } from "@/lib/prisma";
import { isSafeObjectKey } from "@/lib/storage/files";
import { removeStoredObject } from "@/lib/storage/supabase";

const historyCount = {
    appointments: true,
    medicalVisits: true,
    vaccinations: true,
    treatments: true,
    weightRecords: true,
    weights: true,
    careReminders: true,
    visitFollowUps: true,
    documents: true,
} as const satisfies Record<(typeof historyRelations)[number], true>;

async function managedPet(petId: string) {
    let session;
    try {
        session = await requireRole(["ADMIN", "OWNER"]);
    } catch {
        return { error: "denied" as const };
    }
    const id = z.uuid().safeParse(petId);
    if (!id.success) return { error: "missing" as const };
    const pet = await prisma.pet.findUnique({
        where: { id: id.data },
        select: { id: true, ownerId: true, status: true },
    });
    if (!pet || !canManagePetLifecycle(session.user.role, session.user.id, pet.ownerId)) {
        return { error: "denied" as const };
    }
    return { session, pet };
}

function refreshLists() {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/pets/archived");
    revalidatePath("/dashboard/pets/past");
    revalidatePath("/admin/patients");
    revalidatePath("/admin/appointments");
    revalidatePath("/admin/care");
    revalidatePath("/admin/follow-ups");
}

export async function archivePet(petId: string) {
    const found = await managedPet(petId);
    if ("error" in found) return { success: false as const, error: found.error };
    if (found.pet.status === "DECEASED") return { success: false as const, error: "closed" as const };
    if (found.pet.status !== "ARCHIVED") {
        const now = new Date();
        await prisma.$transaction([
            prisma.pet.update({ where: { id: found.pet.id }, data: { status: "ARCHIVED", deceasedAt: null } }),
            prisma.appointment.updateMany({
                where: { petId: found.pet.id, status: "BOOKED", startAt: { gte: now } },
                data: { status: "CANCELLED" },
            }),
            prisma.visitFollowUp.updateMany({
                where: { petId: found.pet.id, status: "PENDING" },
                data: { status: "CANCELLED", cancelledAt: now },
            }),
            prisma.careReminder.updateMany({
                where: { petId: found.pet.id, completedAt: null },
                data: { completedAt: now },
            }),
        ]);
    }
    refreshLists();
    await revalidatePet(found.pet.id);
    return { success: true as const };
}

export async function restorePet(petId: string) {
    const found = await managedPet(petId);
    if ("error" in found) return { success: false as const, error: found.error };
    if (!canRestoreArchivedPet(found.pet)) return { success: false as const, error: "closed" as const };
    await prisma.pet.update({ where: { id: found.pet.id }, data: { status: "ACTIVE", deceasedAt: null } });
    refreshLists();
    await revalidatePet(found.pet.id);
    return { success: true as const };
}

async function removePetFile(bucket: string, objectKey: string) {
    if (!isSafeObjectKey(objectKey)) return false;
    try {
        await removeStoredObject(bucket, objectKey);
        return true;
    } catch {
        return false;
    }
}

export async function deletePet(petId: string) {
    const found = await managedPet(petId);
    if ("error" in found) return { success: false as const, error: found.error };

    const chart = await prisma.pet.findUnique({
        where: { id: found.pet.id },
        select: {
            photoUrl: true,
            documents: { select: { storedName: true } },
            _count: { select: historyCount },
        },
    });
    if (!chart) return { success: false as const, error: "missing" as const };
    const hasHistory = petHasHistory(chart._count);
    if (!canPermanentlyDeletePet(found.session.user.role, found.session.user.id, found.pet.ownerId, hasHistory)) {
        return { success: false as const, error: "history" as const };
    }

    const files = petStorageObjects(chart);
    try {
        await prisma.pet.delete({ where: { id: found.pet.id } });
    } catch {
        return { success: false as const, error: "delete" as const };
    }

    for (const file of files) await removePetFile(file.bucket, file.objectKey);

    refreshLists();
    revalidatePath(`/pets/${found.pet.id}`);
    revalidatePath(`/admin/patients/${found.pet.id}`);
    return { success: true as const };
}
