"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

const profileSchema = z.object({
    name: z.string().trim().min(1).max(80),
    phoneNumber: z.string().trim().min(1).max(30),
});

export async function updateOwnerProfile(input: unknown) {
    let session;
    try {
        session = await requireRole(["OWNER"]);
    } catch {
        return { success: false as const, formErrors: ["You need to sign in."] };
    }

    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Check your details."] };

    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            name: parsed.data.name,
            phoneNumber: parsed.data.phoneNumber,
        },
    });
    revalidatePath("/dashboard");
    revalidatePath("/profile");
    return { success: true as const };
}
