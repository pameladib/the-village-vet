"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { appointmentsCoveredByBlock, beirutInstant } from "@/lib/appointments/availability";
import { appointmentDetail } from "@/lib/appointments/labels";
import { getLocale, messages } from "@/lib/i18n";

const blockSchema = z.object({
    date: z.iso.date(),
    startHour: z.coerce.number().int().min(0).max(23),
    startMinute: z.coerce.number().int().min(0).max(59),
    endHour: z.coerce.number().int().min(0).max(23),
    endMinute: z.coerce.number().int().min(0).max(59),
    scope: z.enum(["CLINIC", "GROOMING", "BOTH"]),
    confirm: z.boolean().optional(),
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

    const startAt = beirutInstant(parsed.data.date, parsed.data.startHour, parsed.data.startMinute);
    const endAt = beirutInstant(parsed.data.date, parsed.data.endHour, parsed.data.endMinute);

    if (!parsed.data.confirm) {
        const booked = await prisma.appointment.findMany({
            where: {
                status: "BOOKED",
                startAt: { lt: endAt, gt: new Date(startAt.getTime() - 2 * 60 * 60_000) },
            },
            select: {
                id: true,
                type: true,
                startAt: true,
                duration: true,
                services: true,
                groomingService: true,
                pet: { select: { name: true } },
            },
            orderBy: { startAt: "asc" },
        });
        const conflicts = appointmentsCoveredByBlock(parsed.data.scope, startAt, endAt, booked);
        if (conflicts.length > 0) {
            const copy = messages(await getLocale());
            return {
                success: false as const,
                conflicts: conflicts.map((appointment) => ({
                    id: appointment.id,
                    petName: appointment.pet.name,
                    detail: appointmentDetail(appointment.type, appointment.services, appointment.groomingService, copy),
                    startAt: appointment.startAt.toISOString(),
                    duration: appointment.duration,
                })),
            };
        }
    }

    const block = await prisma.scheduleBlock.create({
        data: {
            startAt,
            endAt,
            scope: parsed.data.scope,
            createdById: session.user.id,
        },
        select: { id: true, startAt: true, endAt: true, scope: true },
    });
    revalidatePath("/admin/blocks");
    return {
        success: true as const,
        block: { id: block.id, startAt: block.startAt.toISOString(), endAt: block.endAt.toISOString(), scope: block.scope },
    };
}

export async function deleteBlock(id: string) {
    const session = await admin();
    if (!session) return { success: false as const, formErrors: ["You need an administrator account."] };
    if (!z.uuid().safeParse(id).success) return { success: false as const, formErrors: ["That block was not found."] };
    await prisma.scheduleBlock.deleteMany({ where: { id } });
    revalidatePath("/admin/blocks");
    return { success: true as const };
}
