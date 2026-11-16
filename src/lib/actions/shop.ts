"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { notify, notifyOwnerAndStaff } from "@/lib/notifications";
import { planReservation } from "@/lib/shop/reservation";
import { acceptPhoto, isSafeObjectKey, objectKey, PHOTO_TYPES, preparePhoto, PRODUCT_PHOTOS_BUCKET } from "@/lib/storage/files";
import { createUploadUrl, ensurePrivateBucket, readStoredPrefix, removeStoredObject, StorageNotConfiguredError } from "@/lib/storage/supabase";

const orderSchema = z.object({
    items: z.array(z.object({
        productId: z.uuid(),
        quantity: z.number().int().min(1).max(20),
    })).min(1),
    fulfillment: z.enum(["PICKUP", "DELIVERY"]),
    payment: z.enum(["CASH", "WHISH"]),
    deliveryAddress: z.string().trim().max(200).optional(),
    deliveryPhone: z.string().trim().max(30).optional(),
    deliveryNote: z.string().trim().max(300).optional(),
});

const productSchema = z.object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1).max(120),
    nameAr: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
    descriptionAr: z.string().trim().max(500).optional(),
    price: z.number().int().min(0),
    stock: z.number().int().min(0),
    categoryId: z.uuid(),
    available: z.boolean().optional(),
    photoUrl: z.string().trim().min(1).max(300),
});

const categorySchema = z.object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1).max(80),
    nameAr: z.string().trim().min(1).max(80),
});

function storedPhoto(value: string) {
    if (value.startsWith("/images/") || value.startsWith("https://") || isSafeObjectKey(value)) return value;
    return null;
}

function refreshShop(productId?: string) {
    revalidatePath("/admin/shop");
    revalidatePath("/shop");
    if (productId) revalidatePath(`/shop/${productId}`);
}

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
    if (parsed.data.fulfillment === "DELIVERY" && !parsed.data.deliveryAddress) {
        return { success: false as const, formErrors: ["Enter the delivery address."] };
    }
    if (parsed.data.fulfillment === "DELIVERY" && (parsed.data.deliveryPhone ?? "").length < 6) {
        return { success: false as const, formErrors: ["Enter a contact number."] };
    }

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
                    payment: parsed.data.payment,
                    fulfillment: parsed.data.fulfillment,
                    deliveryAddress: parsed.data.fulfillment === "DELIVERY" ? parsed.data.deliveryAddress : null,
                    deliveryPhone: parsed.data.fulfillment === "DELIVERY" ? parsed.data.deliveryPhone : null,
                    deliveryNote: parsed.data.fulfillment === "DELIVERY" ? parsed.data.deliveryNote || null : null,
                    items: { create: plan.lines },
                },
            });
        });

        await notifyOwnerAndStaff(session.user.id, "New shop order", "This order is waiting for the clinic to approve it. It is not confirmed yet.", `order:${order.id}`, { owner: "/shop/orders", staff: `/admin/orders/${order.id}` });
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
    const photoUrl = storedPhoto(parsed.data.photoUrl);
    if (!photoUrl) return { success: false as const, formErrors: ["Add a photo."] };
    const data = {
        name: parsed.data.name,
        nameAr: parsed.data.nameAr,
        description: parsed.data.description || null,
        descriptionAr: parsed.data.descriptionAr || null,
        price: parsed.data.price,
        stock: parsed.data.stock,
        categoryId: parsed.data.categoryId,
        available: parsed.data.available ?? true,
        photoUrl,
    };
    if (parsed.data.id) {
        const existing = await prisma.product.findUnique({ where: { id: parsed.data.id }, select: { photoUrl: true, stock: true } });
        if (!existing) return { success: false as const, formErrors: ["That product was not found."] };
        const delta = data.stock - existing.stock;
        await prisma.$transaction(async (tx) => {
            await tx.product.update({ where: { id: parsed.data.id }, data });
            if (delta !== 0) {
                await tx.stockMovement.create({
                    data: { productId: parsed.data.id!, type: "CORRECT", delta, staffId: session.user.id },
                });
            }
        });
        if (existing.photoUrl && existing.photoUrl !== photoUrl && isSafeObjectKey(existing.photoUrl)) {
            await removeStoredObject(PRODUCT_PHOTOS_BUCKET, existing.photoUrl).catch(() => undefined);
        }
    } else {
        await prisma.$transaction(async (tx) => {
            const created = await tx.product.create({ data });
            if (data.stock > 0) {
                await tx.stockMovement.create({
                    data: { productId: created.id, type: "RECEIVE", delta: data.stock, staffId: session.user.id },
                });
            }
        });
    }
    refreshShop(parsed.data.id);
    return { success: true as const };
}

export async function deleteProduct(productId: string) {
    const session = await shopStaff();
    if (!session) return { success: false as const, formErrors: ["You need a staff account."] };
    if (!z.uuid().safeParse(productId).success) return { success: false as const, formErrors: ["That product was not found."] };
    const existing = await prisma.product.findUnique({ where: { id: productId }, select: { photoUrl: true } });
    if (!existing) return { success: false as const, formErrors: ["That product was not found."] };
    try {
        await prisma.product.delete({ where: { id: productId } });
    } catch {
        return { success: false as const, formErrors: ["This product is on an order, so it can be hidden instead of deleted."] };
    }
    if (existing.photoUrl && isSafeObjectKey(existing.photoUrl)) {
        await removeStoredObject(PRODUCT_PHOTOS_BUCKET, existing.photoUrl).catch(() => undefined);
    }
    refreshShop(productId);
    return { success: true as const };
}

export async function setOrderStatus(orderId: string, status: "APPROVED" | "PREPARING" | "OUT_FOR_DELIVERY" | "REJECTED" | "FULFILLED") {
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
    const allowed =
        (status === "APPROVED" && order.status === "PENDING")
        || (status === "PREPARING" && order.status === "APPROVED")
        || (status === "OUT_FOR_DELIVERY" && order.status === "PREPARING" && order.fulfillment === "DELIVERY")
        || (status === "FULFILLED" && (order.status === "OUT_FOR_DELIVERY" || (order.status === "PREPARING" && order.fulfillment !== "DELIVERY")))
        || status === "REJECTED";
    if (!allowed) return { success: false as const, formErrors: ["That status change is not allowed."] };

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

    const title = status === "REJECTED" ? "Order declined" : status === "FULFILLED" ? "Order completed" : status === "PREPARING" ? "Order being prepared" : status === "OUT_FOR_DELIVERY" ? "Order on the way" : "Order approved";
    const ownerBody = status === "APPROVED"
        ? order.fulfillment === "DELIVERY"
            ? "The clinic approved your order. It will be delivered soon."
            : "The clinic approved your order. You can pick it up at the clinic."
        : status === "PREPARING"
            ? "The clinic is preparing your order."
            : status === "OUT_FOR_DELIVERY"
                ? "Your order is on the way."
                : status === "FULFILLED"
                    ? order.fulfillment === "DELIVERY"
                        ? "Your order has been delivered."
                        : "Your order is complete."
                    : status === "REJECTED"
                        ? "The clinic declined this order."
                        : "The clinic updated your shop order.";
    await notify(order.ownerId, title, ownerBody, `order:${order.id}:${status}:${order.ownerId}`, "/shop/orders");
    const staff = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SECONDARY_ADMIN"] }, NOT: { id: order.ownerId } },
        select: { id: true },
    });
    for (const person of staff) {
        await notify(person.id, title, "A shop order was updated.", `order:${order.id}:${status}:${person.id}`, `/admin/orders/${order.id}`);
    }
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${order.id}`);
    revalidatePath("/shop/orders");
    return { success: true as const };
}

export async function prepareProductPhoto(input: { contentType: string; size: number }) {
    const session = await shopStaff();
    if (!session) return { success: false as const, formErrors: ["You need a staff account."] };
    const check = preparePhoto(input.contentType, input.size);
    if (!check.ok) return { success: false as const, formErrors: [check.message] };
    const extension = PHOTO_TYPES[input.contentType as keyof typeof PHOTO_TYPES];
    try {
        await ensurePrivateBucket(PRODUCT_PHOTOS_BUCKET);
        const key = objectKey(crypto.randomUUID(), extension);
        const signedUrl = await createUploadUrl(PRODUCT_PHOTOS_BUCKET, key);
        return { success: true as const, key, signedUrl };
    } catch (error) {
        if (error instanceof StorageNotConfiguredError) return { success: false as const, formErrors: [error.message] };
        return { success: false as const, formErrors: ["Could not prepare the upload."] };
    }
}

export async function confirmProductPhoto(input: { key: string; contentType: string }) {
    const session = await shopStaff();
    if (!session) return { success: false as const, formErrors: ["You need a staff account."] };
    const extension = PHOTO_TYPES[input.contentType as keyof typeof PHOTO_TYPES];
    if (!extension || !isSafeObjectKey(input.key) || !input.key.endsWith(`.${extension}`)) {
        return { success: false as const, formErrors: ["Could not store the photo."] };
    }
    try {
        const stored = await readStoredPrefix(PRODUCT_PHOTOS_BUCKET, input.key);
        if (!stored || (stored.contentType && stored.contentType !== input.contentType)) {
            if (stored) await removeStoredObject(PRODUCT_PHOTOS_BUCKET, input.key).catch(() => undefined);
            return { success: false as const, formErrors: ["Could not store the photo."] };
        }
        const accepted = acceptPhoto(input.contentType, stored.size, stored.prefix);
        if (!accepted.ok) {
            await removeStoredObject(PRODUCT_PHOTOS_BUCKET, input.key).catch(() => undefined);
            return { success: false as const, formErrors: [accepted.message] };
        }
        return { success: true as const, key: input.key };
    } catch (error) {
        await removeStoredObject(PRODUCT_PHOTOS_BUCKET, input.key).catch(() => undefined);
        if (error instanceof StorageNotConfiguredError) return { success: false as const, formErrors: [error.message] };
        return { success: false as const, formErrors: ["Could not store the photo."] };
    }
}

export async function saveCategory(input: unknown) {
    const session = await shopStaff();
    if (!session) return { success: false as const, formErrors: ["You need a staff account."] };
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Check the product details."] };
    const duplicate = await prisma.productCategory.findFirst({
        where: { name: parsed.data.name, NOT: parsed.data.id ? { id: parsed.data.id } : undefined },
        select: { id: true },
    });
    if (duplicate) return { success: false as const, formErrors: ["A category with that English name already exists."] };
    if (parsed.data.id) {
        const updated = await prisma.productCategory.updateMany({
            where: { id: parsed.data.id },
            data: { name: parsed.data.name, nameAr: parsed.data.nameAr },
        });
        if (updated.count !== 1) return { success: false as const, formErrors: ["That category was not found."] };
    } else {
        const last = await prisma.productCategory.aggregate({ _max: { position: true } });
        await prisma.productCategory.create({
            data: { name: parsed.data.name, nameAr: parsed.data.nameAr, position: (last._max.position ?? 0) + 1 },
        });
    }
    refreshShop();
    return { success: true as const };
}

export async function deleteCategory(categoryId: string) {
    const session = await shopStaff();
    if (!session) return { success: false as const, formErrors: ["You need a staff account."] };
    if (!z.uuid().safeParse(categoryId).success) return { success: false as const, formErrors: ["That category was not found."] };
    const count = await prisma.product.count({ where: { categoryId } });
    if (count > 0) return { success: false as const, formErrors: ["This category still has products, so it cannot be deleted."] };
    const deleted = await prisma.productCategory.deleteMany({ where: { id: categoryId } });
    if (deleted.count !== 1) return { success: false as const, formErrors: ["That category was not found."] };
    refreshShop();
    return { success: true as const };
}
