"use server";

import { prisma } from "@/lib/prisma";

export async function loginFailureReason(username: string) {
    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,30}$/.test(normalized)) return "username" as const;
    try {
        const user = await prisma.user.findUnique({
            where: { username: normalized },
            select: { id: true },
        });
        return user ? "password" as const : "username" as const;
    } catch {
        return "unknown" as const;
    }
}
