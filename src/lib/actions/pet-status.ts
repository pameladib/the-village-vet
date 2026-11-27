"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { todayInBeirut } from "@/lib/appointments/availability";
import { requireRole } from "@/lib/auth/session";
import { revalidatePet } from "@/lib/paths";
import { optionalDeceasedDay } from "@/lib/pets/status";
import { prisma } from "@/lib/prisma";

export async function markPetDeceased(petId: string, date: string) {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        return { success: false as const, error: "denied" as const };
    }

    const id = z.uuid().safeParse(petId);
    const deceasedAt = optionalDeceasedDay(date, todayInBeirut());
    if (!id.success || !deceasedAt.ok) return { success: false as const, error: "date" as const };

    const pet = await prisma.pet.findUnique({ where: { id: id.data }, select: { id: true, status: true } });
    if (!pet || pet.status === "DECEASED") return { success: false as const, error: "closed" as const };

    const now = new Date();
    await prisma.$transaction([
        prisma.pet.update({
            where: { id: pet.id },
            data: { status: "DECEASED", deceasedAt: deceasedAt.date },
        }),
        prisma.appointment.updateMany({
            where: { petId: pet.id, status: "BOOKED", startAt: { gte: now } },
            data: { status: "CANCELLED" },
        }),
        prisma.visitFollowUp.updateMany({
            where: { petId: pet.id, status: "PENDING" },
            data: { status: "CANCELLED", cancelledAt: now },
        }),
    ]);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/pets/archived");
    revalidatePath("/dashboard/pets/past");
    revalidatePath("/admin/patients");
    revalidatePath("/admin/appointments");
    revalidatePath("/admin/care");
    revalidatePath("/admin/follow-ups");
    await revalidatePet(pet.id);
    return { success: true as const };
}
