"use server";

import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

const inviteSchema = z.object({
    name: z.string().trim().min(1).max(80),
    phoneNumber: z.string().trim().min(6).max(30),
});

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

// There is no email provider, so the vet copies a one-time link instead of sending a password.
export async function createOwnerInvite(input: { name: string; phoneNumber: string }) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        return { success: false as const, formErrors: ["You need a staff account."] };
    }

    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Enter a name and a phone number."] };

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
    await prisma.verification.create({
        data: {
            id: crypto.randomUUID(),
            identifier: `owner-invite:${hashToken(token)}`,
            value: JSON.stringify({ name: parsed.data.name, phoneNumber: parsed.data.phoneNumber }),
            expiresAt,
        },
    });

    return { success: true as const, path: `/account/setup?token=${token}`, expiresAt: expiresAt.toISOString() };
}

export async function consumeOwnerInvite(token: string, phoneNumber: string) {
    const parsed = z.string().min(20).safeParse(token);
    if (!parsed.success) return { success: false as const };
    const invite = await prisma.verification.findFirst({
        where: {
            identifier: `owner-invite:${hashToken(parsed.data)}`,
            expiresAt: { gt: new Date() },
        },
    });
    if (!invite) return { success: false as const };
    const stored = JSON.parse(invite.value) as { phoneNumber?: string };
    if (stored.phoneNumber !== phoneNumber.trim()) return { success: false as const };
    await prisma.verification.deleteMany({ where: { id: invite.id } });
    return { success: true as const };
}
