"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { passwordChangeIdentifier } from "@/lib/auth/password-change";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
    name: z.string().trim().min(1).max(80),
    phoneNumber: z.string().trim().min(1).max(30),
});

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function temporaryPassword() {
    const chars: string[] = [];
    const limit = 256 - (256 % alphabet.length);
    while (chars.length < 16) {
        for (const byte of randomBytes(16)) {
            if (byte >= limit) continue;
            const char = alphabet[byte % alphabet.length];
            if (char) chars.push(char);
            if (chars.length === 16) break;
        }
    }
    return chars.join("");
}

async function ownerAccount(userId: string) {
    return prisma.user.findFirst({
        where: { id: userId, role: "OWNER" },
        select: { id: true },
    });
}

export async function updateCustomerAccount(userId: string, input: unknown) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        return { success: false as const, error: "forbidden" as const };
    }
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
        const field = parsed.error.issues[0]?.path[0];
        if (field === "phoneNumber") return { success: false as const, error: "phone" as const };
        if (field === "name") return { success: false as const, error: "name" as const };
        return { success: false as const, error: "invalid" as const };
    }
    const owner = await ownerAccount(userId);
    if (!owner) return { success: false as const, error: "forbidden" as const };

    try {
        await prisma.user.update({
            where: { id: owner.id },
            data: {
                name: parsed.data.name,
                phoneNumber: parsed.data.phoneNumber,
            },
        });
    } catch {
        return { success: false as const, error: "invalid" as const };
    }
    revalidatePath(`/admin/owners/${owner.id}`);
    revalidatePath("/admin/patients");
    return { success: true as const };
}

export async function generateOwnerPassword(userId: string) {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        return { success: false as const, error: "forbidden" as const };
    }
    const owner = await ownerAccount(userId);
    if (!owner) return { success: false as const, error: "not-owner" as const };

    const password = temporaryPassword();
    try {
        const ctx = await auth.$context;
        const hashed = await ctx.password.hash(password);
        const existing = await ctx.internalAdapter.findCredentialAccount(owner.id);
        if (existing) await ctx.internalAdapter.updatePassword(owner.id, hashed);
        else {
            await ctx.internalAdapter.createAccount({
                userId: owner.id,
                providerId: "credential",
                accountId: owner.id,
                password: hashed,
            });
        }
        await ctx.internalAdapter.deleteUserSessions(owner.id);
        const identifier = passwordChangeIdentifier(owner.id);
        await prisma.verification.deleteMany({ where: { identifier } });
        await prisma.verification.create({
            data: {
                id: crypto.randomUUID(),
                identifier,
                value: "required",
                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            },
        });
    } catch {
        return { success: false as const, error: "failed" as const };
    }

    return { success: true as const, password };
}

const changeSchema = z.object({
    newPassword: z.string().min(8).max(128),
});

export async function replaceTemporaryPassword(input: unknown) {
    let session;
    try {
        session = await requireRole(["OWNER"]);
    } catch {
        return { success: false as const, error: "forbidden" as const };
    }
    if (!(await prisma.verification.findFirst({
        where: { identifier: passwordChangeIdentifier(session.user.id), expiresAt: { gt: new Date() } },
        select: { id: true },
    }))) {
        return { success: false as const, error: "forbidden" as const };
    }

    const parsed = changeSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, error: "short" as const };

    try {
        const ctx = await auth.$context;
        const account = await ctx.internalAdapter.findCredentialAccount(session.user.id);
        if (account?.password && await ctx.password.verify({ hash: account.password, password: parsed.data.newPassword })) {
            return { success: false as const, error: "same" as const };
        }
        const hashed = await ctx.password.hash(parsed.data.newPassword);
        if (account) await ctx.internalAdapter.updatePassword(session.user.id, hashed);
        else {
            await ctx.internalAdapter.createAccount({
                userId: session.user.id,
                providerId: "credential",
                accountId: session.user.id,
                password: hashed,
            });
        }
        const others = await prisma.session.findMany({
            where: { userId: session.user.id, NOT: { token: session.session.token } },
            select: { token: true },
        });
        for (const other of others) await ctx.internalAdapter.deleteSession(other.token);
    } catch {
        return { success: false as const, error: "failed" as const };
    }

    await prisma.verification.deleteMany({ where: { identifier: passwordChangeIdentifier(session.user.id) } });
    revalidatePath("/dashboard");
    return { success: true as const };
}
