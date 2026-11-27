"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { applyFollowUp, followUpCreateTab, followUpDueOn } from "@/lib/visits/follow-up";

async function clinician() {
    try {
        return await requireRole(["ADMIN"]);
    } catch {
        return null;
    }
}

async function pending(id: string) {
    const parsed = z.uuid().safeParse(id);
    if (!parsed.success) return null;
    return prisma.visitFollowUp.findUnique({
        where: { id: parsed.data },
        select: { id: true, status: true },
    });
}

export async function completeVisitFollowUp(id: string) {
    if (!await clinician()) return { success: false as const, error: "denied" as const };
    const row = await pending(id);
    const next = row ? applyFollowUp(row.status, "complete") : null;
    if (!row || !next) return { success: false as const, error: "closed" as const };
    const saved = await prisma.visitFollowUp.updateMany({
        where: { id: row.id, status: "PENDING" },
        data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (saved.count !== 1) return { success: false as const, error: "closed" as const };
    refresh();
    return { success: true as const };
}

export async function cancelVisitFollowUp(id: string) {
    if (!await clinician()) return { success: false as const, error: "denied" as const };
    const row = await pending(id);
    const next = row ? applyFollowUp(row.status, "cancel") : null;
    if (!row || !next) return { success: false as const, error: "closed" as const };
    const saved = await prisma.visitFollowUp.updateMany({
        where: { id: row.id, status: "PENDING" },
        data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (saved.count !== 1) return { success: false as const, error: "closed" as const };
    refresh();
    return { success: true as const };
}

export async function rescheduleVisitFollowUp(id: string, date: string) {
    if (!await clinician()) return { success: false as const, error: "denied" as const };
    const row = await pending(id);
    const next = row ? applyFollowUp(row.status, "reschedule", date) : null;
    if (!row || !next || !("dueOn" in next)) return { success: false as const, error: "date" as const };
    const saved = await prisma.visitFollowUp.updateMany({
        where: { id: row.id, status: "PENDING" },
        data: { dueOn: next.dueOn },
    });
    if (saved.count !== 1) return { success: false as const, error: "closed" as const };
    refresh();
    return { success: true as const };
}

export async function searchFollowUpPets(query: string) {
    if (!await clinician()) return [];
    const q = query.trim().slice(0, 80);
    if (q.length < 1) return [];
    return prisma.pet.findMany({
        where: {
            status: "ACTIVE",
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { owner: { name: { contains: q, mode: "insensitive" } } },
            ],
        },
        select: { id: true, name: true, owner: { select: { id: true, name: true, phoneNumber: true } } },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: 8,
    });
}

export async function createVisitFollowUp(input: { petId: string; date: string; notes: string }) {
    if (!await clinician()) return { success: false as const, error: "denied" as const };
    const petId = z.uuid().safeParse(input.petId);
    const tab = followUpCreateTab(input.date);
    const dueOn = followUpDueOn(input.date);
    const notes = input.notes.trim();
    if (!petId.success) return { success: false as const, error: "pet" as const };
    if (!tab || !dueOn) return { success: false as const, error: "date" as const };
    if (notes.length > 1000) return { success: false as const, error: "notes" as const };
    const pet = await prisma.pet.findUnique({ where: { id: petId.data }, select: { id: true, status: true } });
    if (!pet || pet.status !== "ACTIVE") return { success: false as const, error: "pet" as const };
    const created = await prisma.visitFollowUp.create({
        data: { petId: pet.id, dueOn, notes: notes || null },
        select: { id: true },
    });
    refresh();
    return { success: true as const, id: created.id, tab };
}

function refresh() {
    revalidatePath("/dashboard");
    revalidatePath("/admin/follow-ups");
    revalidatePath("/admin", "layout");
}
