"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";

export async function markNotificationRead(id: string) {
    let session;
    try {
        session = await requireAuth();
    } catch {
        return { success: false as const };
    }
    if (!z.uuid().safeParse(id).success) return { success: false as const };
    await prisma.notification.updateMany({
        where: { id, userId: session.user.id, readAt: null },
        data: { readAt: new Date() },
    });
    revalidatePath("/", "layout");
    return { success: true as const };
}
