"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { openOrderStatuses } from "@/lib/shop/inventory";

const quantitySchema = z.number().int().min(1).max(10000);
const noteSchema = z.string().trim().min(1).max(300);

async function staff() {
    try {
        return await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        return null;
    }
}

function refresh(productId: string) {
    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/inventory/${productId}`);
    revalidatePath("/dashboard");
    revalidatePath("/admin/shop");
    revalidatePath("/shop");
    revalidatePath(`/shop/${productId}`);
}

export async function receiveStock(productId: string, quantity: number, note: string) {
    const session = await staff();
    if (!session) return { success: false as const, error: "forbidden" as const };
    if (!z.uuid().safeParse(productId).success || !quantitySchema.safeParse(quantity).success) {
        return { success: false as const, error: "invalid" as const };
    }
    const reason = noteSchema.safeParse(note);
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return { success: false as const, error: "missing" as const };
    await prisma.$transaction([
        prisma.product.update({ where: { id: productId }, data: { stock: { increment: quantity } } }),
        prisma.stockMovement.create({
            data: {
                productId,
                type: "RECEIVE",
                delta: quantity,
                note: reason.success ? reason.data : null,
                staffId: session.user.id,
            },
        }),
    ]);
    refresh(productId);
    return { success: true as const };
}

export async function writeOffStock(productId: string, quantity: number, note: string) {
    const session = await staff();
    if (!session) return { success: false as const, error: "forbidden" as const };
    if (!z.uuid().safeParse(productId).success || !quantitySchema.safeParse(quantity).success || !noteSchema.safeParse(note).success) {
        return { success: false as const, error: "invalid" as const };
    }
    const reason = note.trim();
    try {
        await prisma.$transaction(async (tx) => {
            const updated = await tx.product.updateMany({
                where: { id: productId, stock: { gte: quantity } },
                data: { stock: { decrement: quantity } },
            });
            if (updated.count !== 1) throw new Error("not-enough");
            await tx.stockMovement.create({
                data: { productId, type: "DAMAGE", delta: -quantity, note: reason, staffId: session.user.id },
            });
        });
    } catch (error) {
        if (error instanceof Error && error.message === "not-enough") return { success: false as const, error: "not-enough" as const };
        return { success: false as const, error: "missing" as const };
    }
    refresh(productId);
    return { success: true as const };
}

export async function correctStock(productId: string, counted: number, note: string) {
    const session = await staff();
    if (!session) return { success: false as const, error: "forbidden" as const };
    if (!z.uuid().safeParse(productId).success || !z.number().int().min(0).max(100000).safeParse(counted).success || !noteSchema.safeParse(note).success) {
        return { success: false as const, error: "invalid" as const };
    }
    const reason = note.trim();
    try {
        await prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<Array<{ stock: number }>>`SELECT "stock" FROM "product" WHERE "id" = ${productId} FOR UPDATE`;
            const current = locked[0];
            if (!current) throw new Error("missing");
            const reserved = await tx.orderItem.aggregate({
                where: { productId, order: { status: { in: [...openOrderStatuses] } } },
                _sum: { quantity: true },
            });
            const held = reserved._sum.quantity ?? 0;
            if (counted < held) throw new Error("count-low");
            const next = counted - held;
            const delta = next - current.stock;
            if (delta !== 0) {
                await tx.product.update({ where: { id: productId }, data: { stock: next } });
                await tx.stockMovement.create({
                    data: { productId, type: "CORRECT", delta, note: reason, staffId: session.user.id },
                });
            }
        });
    } catch (error) {
        const code = error instanceof Error ? error.message : "";
        if (code === "count-low" || code === "missing") return { success: false as const, error: code };
        return { success: false as const, error: "invalid" as const };
    }
    refresh(productId);
    return { success: true as const };
}

export async function setLowStockThreshold(productId: string, threshold: number) {
    const session = await staff();
    if (!session) return { success: false as const, error: "forbidden" as const };
    if (!z.uuid().safeParse(productId).success || !z.number().int().min(0).max(1000).safeParse(threshold).success) {
        return { success: false as const, error: "invalid" as const };
    }
    const updated = await prisma.product.updateMany({ where: { id: productId }, data: { lowStockAt: threshold } });
    if (updated.count !== 1) return { success: false as const, error: "missing" as const };
    refresh(productId);
    return { success: true as const };
}
