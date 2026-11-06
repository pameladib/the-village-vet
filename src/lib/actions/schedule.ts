"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { beirutInstant } from "@/lib/appointments/availability";

const blockSchema = z.object({
    date: z.iso.date(),
    startHour: z.coerce.number().int().min(0).max(23),
    startMinute: z.coerce.number().int().min(0).max(59),
    endHour: z.coerce.number().int().min(0).max(23),
    endMinute: z.coerce.number().int().min(0).max(59),
    scope: z.enum(["CLINIC", "GROOMING", "BOTH"]),
}).refine((value) => {
    const start = value.startHour * 60 + value.startMinute;
    const end = value.endHour * 60 + value.endMinute;
    return end > start;
}, { message: "The end must be after the start." });

async function admin() {
    try {
        return await requireRole(["ADMIN"]);
    } catch {
        return null;
    }
}

export async function createBlock(input: unknown) {
    const session = await admin();
    if (!session) return { success: false as const, formErrors: ["You need an administrator account."] };
    const parsed = blockSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Enter a valid period."] };

    await prisma.scheduleBlock.create({
        data: {
            startAt: beirutInstant(parsed.data.date, parsed.data.startHour, parsed.data.startMinute),
            endAt: beirutInstant(parsed.data.date, parsed.data.endHour, parsed.data.endMinute),
            scope: parsed.data.scope,
            createdById: session.user.id,
        },
    });
    revalidatePath("/admin");
    return { success: true as const };
}

export async function deleteBlock(id: string) {
    const session = await admin();
    if (!session) return { success: false as const, formErrors: ["You need an administrator account."] };
    if (!z.uuid().safeParse(id).success) return { success: false as const, formErrors: ["That block was not found."] };
    await prisma.scheduleBlock.deleteMany({ where: { id } });
    revalidatePath("/admin");
    return { success: true as const };
}
