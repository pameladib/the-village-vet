"use server";

import { revalidatePath } from "next/cache";
import { canCloseOwnerAccount, canPermanentlyDeleteOwnerAccount, canReactivateOwnerAccount } from "@/lib/auth/permissions";
import { passwordChangeIdentifier } from "@/lib/auth/password-change";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { openOrderStatuses } from "@/lib/shop/inventory";

async function actor() {
    try {
        return await requireAuth();
    } catch {
        return null;
    }
}

async function ownerAccount(userId: string) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, deactivatedAt: true },
    });
}

function refresh(userId: string) {
    revalidatePath("/dashboard");
    revalidatePath("/profile");
    revalidatePath("/admin/patients");
    revalidatePath("/admin/appointments");
    revalidatePath(`/admin/owners/${userId}`);
}

export async function deactivateOwnerAccount(userId: string) {
    const session = await actor();
    if (!session) return { success: false as const, error: "denied" as const };
    const owner = await ownerAccount(userId);
    if (!owner || !canCloseOwnerAccount(session.user.role, session.user.id, owner.role, owner.id)) {
        return { success: false as const, error: "denied" as const };
    }

    const now = new Date();
    try {
        await prisma.$transaction([
            prisma.user.update({ where: { id: owner.id }, data: { deactivatedAt: now } }),
            prisma.session.deleteMany({ where: { userId: owner.id } }),
            prisma.pushSubscription.deleteMany({ where: { userId: owner.id } }),
            prisma.appointment.updateMany({
                where: { ownerId: owner.id, status: "BOOKED", startAt: { gte: now } },
                data: { status: "CANCELLED" },
            }),
        ]);
    } catch {
        return { success: false as const, error: "failed" as const };
    }
    refresh(owner.id);
    return { success: true as const };
}

export async function reactivateOwnerAccount(userId: string) {
    const session = await actor();
    if (!session) return { success: false as const, error: "denied" as const };
    const owner = await ownerAccount(userId);
    if (!owner || !canReactivateOwnerAccount(session.user.role, owner.role)) {
        return { success: false as const, error: "denied" as const };
    }

    try {
        await prisma.user.update({ where: { id: owner.id }, data: { deactivatedAt: null } });
    } catch {
        return { success: false as const, error: "failed" as const };
    }
    refresh(owner.id);
    return { success: true as const };
}

export async function deleteOwnerAccount(userId: string) {
    const session = await actor();
    if (!session) return { success: false as const, error: "denied" as const };
    const owner = await ownerAccount(userId);
    if (!owner) return { success: false as const, error: "denied" as const };

    try {
        await prisma.$transaction(async (tx) => {
            const petCount = await tx.pet.count({ where: { ownerId: owner.id } });
            if (!canPermanentlyDeleteOwnerAccount(session.user.role, session.user.id, owner.role, owner.id, petCount)) {
                throw new Error(petCount > 0 ? "pets" : "denied");
            }
            await tx.shopOrder.updateMany({ where: { ownerId: owner.id }, data: { ownerId: null } });
            await tx.verification.deleteMany({ where: { identifier: passwordChangeIdentifier(owner.id) } });
            await tx.user.delete({ where: { id: owner.id } });
        });
    } catch (error) {
        if (error instanceof Error && error.message === "pets") return { success: false as const, error: "pets" as const };
        if (error instanceof Error && error.message === "denied") return { success: false as const, error: "denied" as const };
        return { success: false as const, error: "failed" as const };
    }
    refresh(owner.id);
    return { success: true as const };
}

export async function ownerAccountSignals(userId: string) {
    const session = await actor();
    if (!session) return null;
    const owner = await ownerAccount(userId);
    if (!owner || !canCloseOwnerAccount(session.user.role, session.user.id, owner.role, owner.id)) return null;

    const [petCount, upcomingAppointments, openOrders] = await Promise.all([
        prisma.pet.count({ where: { ownerId: owner.id } }),
        prisma.appointment.count({ where: { ownerId: owner.id, status: "BOOKED", startAt: { gte: new Date() } } }),
        prisma.shopOrder.count({ where: { ownerId: owner.id, status: { in: [...openOrderStatuses] } } }),
    ]);
    return { petCount, upcomingAppointments, openOrders };
}
