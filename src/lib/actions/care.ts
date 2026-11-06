"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

const dueSchema = z.object({
    reminderId: z.uuid(),
    dueAt: z.iso.date(),
});

const treatmentSchema = z.object({
    petId: z.uuid(),
    treatmentId: z.uuid(),
    dueAt: z.iso.date(),
});

async function vet() {
    try {
        return await requireRole(["ADMIN"]);
    } catch {
        return null;
    }
}

// The vet can move a calculated vaccine date. The next recorded dose still replaces it.
export async function overrideCareDue(input: { reminderId: string; dueAt: string }) {
    const session = await vet();
    if (!session) return { success: false as const, formErrors: ["Only the veterinarian can change a due date."] };
    const parsed = dueSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Enter a valid date."] };

    const updated = await prisma.careReminder.updateMany({
        where: { id: parsed.data.reminderId, completedAt: null },
        data: { dueAt: new Date(`${parsed.data.dueAt}T00:00:00.000Z`), overridden: true },
    });
    if (updated.count !== 1) return { success: false as const, formErrors: ["That reminder is no longer open."] };
    revalidatePath("/dashboard");
    return { success: true as const };
}

// Deworming and flea dates are whatever the vet enters. The app does not invent an interval.
export async function setTreatmentDue(input: { petId: string; treatmentId: string; dueAt: string }) {
    const session = await vet();
    if (!session) return { success: false as const, formErrors: ["Only the veterinarian can set a treatment date."] };
    const parsed = treatmentSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Enter a valid date."] };

    const treatment = await prisma.treatment.findFirst({
        where: { id: parsed.data.treatmentId, petId: parsed.data.petId },
        select: { id: true, type: true },
    });
    if (!treatment) return { success: false as const, formErrors: ["That treatment was not found."] };

    const kind = treatment.type === "FLEA_TICK" ? "FLEA_TREATMENT" : "DEWORMING";
    await prisma.$transaction(async (tx) => {
        await tx.careReminder.deleteMany({
            where: { petId: parsed.data.petId, treatmentId: treatment.id, completedAt: null },
        });
        await tx.careReminder.create({
            data: {
                petId: parsed.data.petId,
                treatmentId: treatment.id,
                kind,
                dueAt: new Date(`${parsed.data.dueAt}T00:00:00.000Z`),
                overridden: true,
            },
        });
    });
    revalidatePath(`/pets/${parsed.data.petId}`);
    return { success: true as const };
}
