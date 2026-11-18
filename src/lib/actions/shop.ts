"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n";
import { messages } from "@/lib/i18n";
import { notify, notifyOwnerAndStaff } from "@/lib/notifications";
import { adminMoves, customerCanCancel, staffCanCancel, stageStamp, stockEffect, type OrderStatus } from "@/lib/shop/lifecycle";
import { convertMinor } from "@/lib/shop/money";
import { getDisplayCurrency, pricingFrom } from "@/lib/shop/pricing";
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
    priceCurrency: z.enum(["USD", "LBP"]),
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

type StockTx = Pick<typeof prisma, "product" | "orderItem">;

async function reserveStock(tx: StockTx, items: { productId: string; quantity: number }[], allowHidden: boolean) {
    const products = await tx.product.findMany({
        where: { id: { in: items.map((item) => item.productId) } },
        select: { id: true, stock: true, available: true, price: true },
    });
    const plan = planReservation(products, items, { allowHidden });
    if (!plan.ok) return null;
    for (const item of plan.lines) {
        const reserved = await tx.product.updateMany({
            where: {
                id: item.productId,
                stock: { gte: item.quantity },
                ...(allowHidden ? {} : { available: true }),
            },
            data: { stock: { decrement: item.quantity } },
        });
        if (reserved.count !== 1) return null;
    }
    return plan.lines;
}

async function releaseStock(tx: StockTx, orderId: string) {
    const items = await tx.orderItem.findMany({ where: { orderId }, select: { productId: true, quantity: true } });
    for (const item of items) {
        await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
        });
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
            const lines = await reserveStock(tx, parsed.data.items, false);
            if (!lines) throw new Error("stock");
            const pricing = pricingFrom(await tx.clinicSetting.findUnique({
                where: { id: "clinic" },
                select: { priceCurrency: true, usdRate: true },
            }));
            const display = await getDisplayCurrency();
            const priced = lines.map((line) => {
                const unitPrice = convertMinor(line.unitPrice, pricing.currency, display, pricing.rate);
                if (unitPrice == null) throw new Error("stock");
                return { ...line, unitPrice };
            });
            const buyer = await tx.user.findUnique({
                where: { id: session.user.id },
                select: { name: true, phoneNumber: true },
            });
            if (!buyer) throw new Error("stock");

            return tx.shopOrder.create({
                data: {
                    ownerId: session.user.id,
                    customerName: buyer.name,
                    customerPhone: buyer.phoneNumber,
                    currency: display,
                    exchangeRate: pricing.rate,
                    payment: parsed.data.payment,
                    fulfillment: parsed.data.fulfillment,
                    deliveryAddress: parsed.data.fulfillment === "DELIVERY" ? parsed.data.deliveryAddress : null,
                    deliveryPhone: parsed.data.fulfillment === "DELIVERY" ? parsed.data.deliveryPhone : null,
                    deliveryNote: parsed.data.fulfillment === "DELIVERY" ? parsed.data.deliveryNote || null : null,
                    items: { create: priced },
                },
            });
        });

        await notifyOwnerAndStaff(
            session.user.id,
            (locale) => messages(locale).noticeOrderNew,
            (locale) => messages(locale).noticeOrderNewBody,
            `order:${order.id}`,
            { owner: `/shop/orders/${order.id}`, staff: `/admin/orders/${order.id}` },
        );
        revalidatePath("/shop/orders");
        return { success: true as const, id: order.id };
    } catch {
        return { success: false as const, formErrors: ["Something in the cart is no longer in stock."] };
    }
}

const staffOrderSchema = z.object({
    mode: z.enum(["sale", "later"]),
    ownerId: z.uuid().optional(),
    customerName: z.string().trim().max(120).optional(),
    customerPhone: z.string().trim().max(30).optional(),
    items: z.array(z.object({
        productId: z.uuid(),
        quantity: z.number().int().min(1).max(99),
    })).min(1).max(30),
    fulfillment: z.enum(["PICKUP", "DELIVERY"]).optional(),
    payment: z.enum(["CASH", "WHISH"]),
    deliveryAddress: z.string().trim().max(200).optional(),
    deliveryPhone: z.string().trim().max(30).optional(),
    deliveryNote: z.string().trim().max(300).optional(),
});

export async function createStaffOrder(input: unknown) {
    const session = await shopStaff();
    if (!session) return { success: false as const, formErrors: ["You need a staff account."] };
    const parsed = staffOrderSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Choose at least one product."] };
    const sale = parsed.data.mode === "sale";
    const fulfillment = sale ? "PICKUP" as const : parsed.data.fulfillment;
    if (!fulfillment) return { success: false as const, formErrors: ["Choose at least one product."] };
    const deliveryPhone = (parsed.data.deliveryPhone || parsed.data.customerPhone || "").trim();
    if (!sale && fulfillment === "DELIVERY" && !parsed.data.deliveryAddress) {
        return { success: false as const, formErrors: ["Enter the delivery address."] };
    }
    if (!sale && fulfillment === "DELIVERY" && deliveryPhone.length < 6) {
        return { success: false as const, formErrors: ["Enter a contact number."] };
    }
    if (!sale && !parsed.data.ownerId && (!(parsed.data.customerName ?? "").trim() || (parsed.data.customerPhone ?? "").trim().length < 6)) {
        return { success: false as const, formErrors: ["Enter the customer’s name and phone."] };
    }

    const now = new Date();
    try {
        const order = await prisma.$transaction(async (tx) => {
            const lines = await reserveStock(tx, parsed.data.items, true);
            if (!lines) throw new Error("stock");
            const pricing = pricingFrom(await tx.clinicSetting.findUnique({
                where: { id: "clinic" },
                select: { priceCurrency: true, usdRate: true },
            }));
            const account = parsed.data.ownerId
                ? await tx.user.findFirst({
                    where: { id: parsed.data.ownerId, role: "OWNER" },
                    select: { id: true, name: true, phoneNumber: true },
                })
                : null;
            if (parsed.data.ownerId && !account) throw new Error("customer");
            const customerName = account?.name ?? (parsed.data.customerName ?? "").trim();
            const customerPhone = account?.phoneNumber ?? (parsed.data.customerPhone ?? "").trim();

            return tx.shopOrder.create({
                data: {
                    status: sale ? "FULFILLED" : "APPROVED",
                    fulfillment,
                    payment: parsed.data.payment,
                    ownerId: account?.id ?? null,
                    customerName,
                    customerPhone,
                    currency: pricing.currency,
                    exchangeRate: pricing.rate,
                    createdById: session.user.id,
                    paidAt: sale ? now : null,
                    approvedAt: sale ? null : now,
                    completedAt: sale ? now : null,
                    deliveryAddress: fulfillment === "DELIVERY" ? parsed.data.deliveryAddress : null,
                    deliveryPhone: fulfillment === "DELIVERY" ? deliveryPhone : null,
                    deliveryNote: fulfillment === "DELIVERY" ? parsed.data.deliveryNote || null : null,
                    items: { create: lines },
                },
                select: { id: true, ownerId: true },
            });
        });

        if (!sale && order.ownerId) {
            try {
                await notify(
                    order.ownerId,
                    (locale) => messages(locale).noticeOrderRecorded,
                    (locale) => messages(locale).noticeOrderRecordedBody,
                    `order:${order.id}:recorded:${order.ownerId}`,
                    `/shop/orders/${order.id}`,
                );
            } catch {
                // The order is already saved.
            }
        }
        refreshOrder(order.id);
        revalidatePath("/shop");
        return { success: true as const, id: order.id };
    } catch (error) {
        if (error instanceof Error && error.message === "customer") {
            return { success: false as const, formErrors: ["Enter the customer’s name and phone."] };
        }
        return { success: false as const, formErrors: ["Something in the cart is no longer in stock."] };
    }
}

export async function searchOrderCustomers(query: string) {
    const session = await shopStaff();
    if (!session) return [];
    const q = query.trim().slice(0, 80);
    if (q.length < 1) return [];
    return prisma.user.findMany({
        where: {
            role: "OWNER",
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { phoneNumber: { contains: q } },
            ],
        },
        select: { id: true, name: true, phoneNumber: true },
        orderBy: { name: "asc" },
        take: 8,
    });
}

export async function searchOrderProducts(query: string) {
    const session = await shopStaff();
    if (!session) return [];
    const q = query.trim().slice(0, 80);
    if (q.length < 1) return [];
    return prisma.product.findMany({
        where: {
            stock: { gt: 0 },
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { nameAr: { contains: q, mode: "insensitive" } },
            ],
        },
        select: { id: true, name: true, nameAr: true, price: true, stock: true, available: true },
        orderBy: { name: "asc" },
        take: 8,
    });
}

export async function quoteCart(ids: string[]) {
    const unique = [...new Set(ids)].filter((id) => z.uuid().safeParse(id).success).slice(0, 30);
    if (unique.length === 0) return { ...pricingFrom(null), products: [] as { id: string; price: number }[] };
    const [products, pricing] = await Promise.all([
        prisma.product.findMany({
            where: { id: { in: unique }, available: true },
            select: { id: true, price: true },
        }),
        prisma.clinicSetting.findUnique({ where: { id: "clinic" }, select: { priceCurrency: true, usdRate: true } }),
    ]);
    const current = pricingFrom(pricing);
    return { currency: current.currency, rate: current.rate, products };
}

export async function saveProduct(input: unknown) {
    const session = await shopStaff();
    if (!session) return { success: false as const, formErrors: ["You need a staff account."] };
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Check the product details."] };
    const photoUrl = storedPhoto(parsed.data.photoUrl);
    if (!photoUrl) return { success: false as const, formErrors: ["Add a photo."] };
    const pricing = pricingFrom(await prisma.clinicSetting.findUnique({
        where: { id: "clinic" },
        select: { priceCurrency: true, usdRate: true },
    }));
    if (parsed.data.priceCurrency !== pricing.currency) {
        return { success: false as const, formErrors: ["The pricing currency changed. Refresh the page and enter the price again."] };
    }
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

function customerNotice(status: string, fulfillment: string) {
    return (locale: Locale) => {
        const copy = messages(locale);
        if (status === "APPROVED") {
            return {
                title: copy.noticeOrderApproved,
                body: fulfillment === "DELIVERY" ? copy.noticeOrderApprovedDelivery : copy.noticeOrderApprovedPickup,
            };
        }
        if (status === "OUT_FOR_DELIVERY") return { title: copy.noticeOrderOut, body: copy.noticeOrderOutBody };
        if (status === "READY_FOR_PICKUP") return { title: copy.noticeOrderReadyTitle, body: copy.noticeOrderReady };
        if (status === "FULFILLED") {
            return {
                title: copy.noticeOrderCompleted,
                body: fulfillment === "DELIVERY" ? copy.noticeOrderDelivered : copy.noticeOrderCompletePickup,
            };
        }
        if (status === "REJECTED") return { title: copy.noticeOrderDeclined, body: copy.noticeOrderDeclinedBody };
        return { title: copy.noticeOrderCancelledTitle, body: copy.noticeOrderCancelled };
    };
}

async function changeOrder(orderId: string, from: OrderStatus[], to: OrderStatus) {
    const stamp = stageStamp(to);
    const now = new Date();
    return prisma.$transaction(async (tx) => {
        const changed = await tx.shopOrder.updateMany({
            where: { id: orderId, status: { in: from } },
            data: { status: to, ...(stamp ? { [stamp]: now } : {}) },
        });
        if (changed.count !== 1) return null;
        if (stockEffect(to) === "release") await releaseStock(tx, orderId);
        return tx.shopOrder.findUnique({ where: { id: orderId }, select: { id: true, ownerId: true, fulfillment: true, status: true } });
    });
}

function refreshOrder(orderId: string) {
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/shop/orders");
    revalidatePath(`/shop/orders/${orderId}`);
    revalidatePath("/admin/inventory");
}

async function tellCustomer(order: { id: string; ownerId: string | null; fulfillment: string; status: string }) {
    if (!order.ownerId) return;
    const notice = customerNotice(order.status, order.fulfillment);
    await notify(
        order.ownerId,
        (locale) => notice(locale).title,
        (locale) => notice(locale).body,
        `order:${order.id}:${order.status}:${order.ownerId}`,
        `/shop/orders/${order.id}`,
    );
}

export async function advanceOrder(orderId: string, next: "APPROVED" | "REJECTED" | "OUT_FOR_DELIVERY" | "READY_FOR_PICKUP" | "FULFILLED") {
    const session = await shopStaff();
    if (!session) return { success: false as const, formErrors: ["You need a staff account."] };
    if (!z.uuid().safeParse(orderId).success) return { success: false as const, formErrors: ["That order was not found."] };
    const order = await prisma.shopOrder.findUnique({ where: { id: orderId }, select: { status: true, fulfillment: true } });
    if (!order) return { success: false as const, formErrors: ["That order was not found."] };
    const move = adminMoves(order.status, order.fulfillment).find((item) => item.to === next);
    if (!move) return { success: false as const, formErrors: ["That status change is not allowed."] };
    const saved = await changeOrder(orderId, move.from, next);
    if (!saved) return { success: false as const, formErrors: ["This order changed."] };
    try {
        await tellCustomer(saved);
    } catch {
        // The status change is already saved. A failed notice must not report the action as failed.
    }
    refreshOrder(orderId);
    return { success: true as const, status: saved.status };
}

export async function cancelOrder(orderId: string) {
    const session = await owner();
    if (!session) return { success: false as const, formErrors: ["You need to sign in."] };
    if (!z.uuid().safeParse(orderId).success) return { success: false as const, formErrors: ["That order was not found."] };
    const order = await prisma.shopOrder.findFirst({
        where: { id: orderId, ownerId: session.user.id },
        select: { status: true },
    });
    if (!order) return { success: false as const, formErrors: ["That order was not found."] };
    if (!customerCanCancel(order.status)) return { success: false as const, formErrors: ["That order can no longer be changed."] };
    const saved = await changeOrder(orderId, ["PENDING"], "CANCELLED");
    if (!saved) return { success: false as const, formErrors: ["This order changed."] };
    try {
        await tellCustomer(saved);
        const staff = await prisma.user.findMany({
            where: { role: { in: ["ADMIN", "SECONDARY_ADMIN"] } },
            select: { id: true },
        });
        for (const person of staff) {
            await notify(
                person.id,
                (locale) => messages(locale).noticeOrderCancelledTitle,
                (locale) => messages(locale).noticeOrderCancelledStaff,
                `order:${saved.id}:cancelled:${person.id}`,
                `/admin/orders/${saved.id}`,
            );
        }
    } catch {
        // The cancellation is already saved.
    }
    refreshOrder(orderId);
    return { success: true as const, status: saved.status };
}

export async function cancelStaffOrder(orderId: string) {
    const session = await shopStaff();
    if (!session) return { success: false as const, formErrors: ["You need a staff account."] };
    if (!z.uuid().safeParse(orderId).success) return { success: false as const, formErrors: ["That order was not found."] };
    const order = await prisma.shopOrder.findUnique({
        where: { id: orderId },
        select: { status: true, createdById: true, approvedAt: true, outForDeliveryAt: true, readyForPickupAt: true, ownerId: true },
    });
    if (!order || !staffCanCancel(order)) return { success: false as const, formErrors: ["That order can no longer be changed."] };

    const now = new Date();
    const saved = await prisma.$transaction(async (tx) => {
        const changed = await tx.shopOrder.updateMany({
            where: {
                id: orderId,
                createdById: { not: null },
                status: order.status === "FULFILLED" ? "FULFILLED" : { in: ["APPROVED", "PREPARING", "READY_FOR_PICKUP"] },
                ...(order.status === "FULFILLED" ? { approvedAt: null, outForDeliveryAt: null, readyForPickupAt: null } : {}),
            },
            data: { status: "CANCELLED", cancelledAt: now },
        });
        if (changed.count !== 1) return null;
        await releaseStock(tx, orderId);
        return tx.shopOrder.findUnique({ where: { id: orderId }, select: { id: true, ownerId: true } });
    });
    if (!saved) return { success: false as const, formErrors: ["This order changed."] };
    if (saved.ownerId) {
        try {
            await notify(
                saved.ownerId,
                (locale) => messages(locale).noticeOrderCancelledTitle,
                (locale) => messages(locale).noticeOrderCancelledClinic,
                `order:${saved.id}:cancelled:${saved.ownerId}`,
                `/shop/orders/${saved.id}`,
            );
        } catch {
            // The cancellation is already saved.
        }
    }
    refreshOrder(orderId);
    revalidatePath("/shop");
    return { success: true as const, status: "CANCELLED" as const };
}

export async function setOrderPaid(orderId: string, paid: boolean) {
    const session = await shopStaff();
    if (!session) return { success: false as const, formErrors: ["You need a staff account."] };
    if (!z.uuid().safeParse(orderId).success) return { success: false as const, formErrors: ["That order was not found."] };
    const updated = await prisma.shopOrder.updateMany({
        where: { id: orderId, paidAt: paid ? null : { not: null } },
        data: { paidAt: paid ? new Date() : null },
    });
    if (updated.count !== 1) return { success: false as const, formErrors: ["This order changed."] };
    refreshOrder(orderId);
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
