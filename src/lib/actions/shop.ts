"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { notifyOwnerAndStaff } from "@/lib/notifications";
import { planReservation } from "@/lib/shop/reservation";

const orderSchema = z.object({
    items: z.array(z.object({
        productId: z.uuid(),
        quantity: z.number().int().min(1).max(20),
    })).min(1),
});

const productSchema = z.object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1),
    description: z.string().trim().optional(),
    price: z.number().int().min(0),
    stock: z.number().int().min(0),
    categoryId: z.uuid(),
    available: z.boolean().optional(),
});

async function owner() {
    try {
        return await requireRole(["OWNER"]);
    } catch {
        return null;
    }
}

async function shopStaff() {
    try {
        return await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        return null;
    }
}

export async function placeOrder(input: unknown) {
    const session = await owner();
    if (!session) return { success: false as const, formErrors: ["You need to sign in."] };
    const parsed = orderSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Choose at least one product."] };

    try {
        const order = await prisma.$transaction(async (tx) => {
            const products = await tx.product.findMany({
                where: { id: { in: parsed.data.items.map((item) => item.productId) } },
            });
            const plan = planReservation(products, parsed.data.items);
            if (!plan.ok) throw new Error("stock");

            for (const item of plan.lines) {
                const reserved = await tx.product.updateMany({
                    where: { id: item.productId, available: true, stock: { gte: item.quantity } },
                    data: { stock: { decrement: item.quantity } },
                });
                if (reserved.count !== 1) throw new Error("stock");
            }

            return tx.shopOrder.create({
                data: {
                    ownerId: session.user.id,
                    payment: "CASH_ON_DELIVERY",
                    items: { create: plan.lines },
                },
            });
        });

        await notifyOwnerAndStaff(session.user.id, "New shop order", "An order is waiting for the clinic.", `order:${order.id}`);
        revalidatePath("/shop/orders");
        return { success: true as const, id: order.id };
    } catch {
        return { success: false as const, formErrors: ["Something in the cart is no longer in stock."] };
    }
}

export async function saveProduct(input: unknown) {
    const session = await shopStaff();
    if (!session) return { success: false as const, formErrors: ["You need a staff account."] };
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Check the product details."] };
    const data = {
        name: parsed.data.name,
        description: parsed.data.description || null,
        price: parsed.data.price,
        stock: parsed.data.stock,
        categoryId: parsed.data.categoryId,
        available: parsed.data.available ?? true,
    };
    if (parsed.data.id) {
        await prisma.product.update({ where: { id: parsed.data.id }, data });
    } else {
        await prisma.product.create({ data });
    }
    revalidatePath("/admin/shop");
    revalidatePath("/shop");
    return { success: true as const };
}

export async function deleteProduct(productId: string) {
    const session = await shopStaff();
    if (!session) return { success: false as const, formErrors: ["You need a staff account."] };
    if (!z.uuid().safeParse(productId).success) return { success: false as const, formErrors: ["That product was not found."] };
    try {
        await prisma.product.delete({ where: { id: productId } });
    } catch {
        return { success: false as const, formErrors: ["This product is on an order, so it can be hidden instead of deleted."] };
    }
    revalidatePath("/admin/shop");
    revalidatePath("/shop");
    return { success: true as const };
}

export async function setOrderStatus(orderId: string, status: "APPROVED" | "REJECTED" | "FULFILLED") {
    const session = await shopStaff();
    if (!session) return { success: false as const, formErrors: ["You need a staff account."] };
    if (!z.uuid().safeParse(orderId).success) return { success: false as const, formErrors: ["That order was not found."] };

    const order = await prisma.shopOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
    });
    if (!order || order.status === "REJECTED" || order.status === "FULFILLED") {
        return { success: false as const, formErrors: ["That order can no longer be changed."] };
    }
    if (status === "FULFILLED" && order.status !== "APPROVED") {
        return { success: false as const, formErrors: ["Approve the order before fulfilling it."] };
    }

    await prisma.$transaction(async (tx) => {
        if (status === "REJECTED") {
            for (const item of order.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } },
                });
            }
        }
        await tx.shopOrder.update({ where: { id: order.id }, data: { status } });
    });

    const title = status === "REJECTED" ? "Order declined" : status === "FULFILLED" ? "Order ready" : "Order approved";
    await notifyOwnerAndStaff(order.ownerId, title, "The clinic updated your shop order.", `order:${order.id}:${status}`);
    revalidatePath("/admin/orders");
    return { success: true as const };
}
