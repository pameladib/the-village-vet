"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { applyFollowUp } from "@/lib/visits/follow-up";

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

function refresh() {
    revalidatePath("/dashboard");
    revalidatePath("/admin/follow-ups");
    revalidatePath("/admin", "layout");
}
