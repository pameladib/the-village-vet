"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";

const subscriptionSchema = z.object({
    endpoint: z.string().url().max(2000),
    p256dh: z.string().min(1).max(300),
    auth: z.string().min(1).max(300),
});

export async function savePushSubscription(input: unknown) {
    let session;
    try {
        session = await requireAuth();
    } catch {
        return { success: false as const };
    }
    const parsed = subscriptionSchema.safeParse(input);
    if (!parsed.success) return { success: false as const };
    let endpoint: URL;
    try {
        endpoint = new URL(parsed.data.endpoint);
    } catch {
        return { success: false as const };
    }
    if (endpoint.protocol !== "https:") return { success: false as const };

    await prisma.pushSubscription.upsert({
        where: { endpoint: parsed.data.endpoint },
        create: {
            endpoint: parsed.data.endpoint,
            p256dh: parsed.data.p256dh,
            auth: parsed.data.auth,
            userId: session.user.id,
        },
        update: {
            p256dh: parsed.data.p256dh,
            auth: parsed.data.auth,
            userId: session.user.id,
        },
    });
    return { success: true as const };
}

export async function removePushSubscription(endpoint: string) {
    let session;
    try {
        session = await requireAuth();
    } catch {
        return { success: false as const };
    }
    if (!endpoint.startsWith("https://") || endpoint.length > 2000) return { success: false as const };
    await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: session.user.id },
    });
    return { success: true as const };
}
