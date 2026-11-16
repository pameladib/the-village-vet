import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export function passwordChangeIdentifier(userId: string) {
    return `must-change-password:${userId}`;
}

export async function ownerMustChangePassword(userId: string) {
    const row = await prisma.verification.findFirst({
        where: { identifier: passwordChangeIdentifier(userId), expiresAt: { gt: new Date() } },
        select: { id: true },
    });
    return row != null;
}

export async function enforcePasswordChange(role: string | undefined, userId: string | undefined) {
    if (role !== "OWNER" || !userId) return;
    const pathname = (await headers()).get("x-pathname") ?? "";
    if (!pathname || pathname === "/account/password") return;
    if (await ownerMustChangePassword(userId)) redirect("/account/password");
}
