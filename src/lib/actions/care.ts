"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { doseDates, applyReminderPlan } from "@/lib/clinic/visit-care";
import { dateOnlyUtc, doseConflict, formatDateOnly, nextVaccineDue, planFollowUp } from "@/lib/clinic/vaccines";
import { revalidatePet } from "@/lib/paths";
import { prisma } from "@/lib/prisma";

const vaccinationSchema = z.object({
    petId: z.string().min(1),
    recordId: z.string().min(1).optional(),
    medicalVisitId: z.string().min(1).optional(),
    type: z.enum(["FIRST", "SECOND", "THIRD", "ANNUAL"]),
    administeredAt: z.string(),
    nextDueAt: z.string(),
});

const treatmentSchema = z.object({
    petId: z.string().min(1),
    recordId: z.string().min(1).optional(),
    medicalVisitId: z.string().min(1).optional(),
    type: z.enum(["DEWORMING", "FLEA_TICK"]),
    administeredAt: z.string(),
    nextDueAt: z.string(),
});

async function veterinarian() {
    try {
        return await requireRole(["ADMIN"]);
    } catch {
        return null;
    }
}

async function refresh(petId: string, visitId?: string) {
    await revalidatePet(petId, visitId);
    revalidatePath("/dashboard");
    revalidatePath("/admin/care");
}

async function visitOnPet(petId: string, medicalVisitId: string | undefined) {
    if (!medicalVisitId) return { id: undefined as string | undefined };
    const visit = await prisma.medicalVisit.findFirst({
        where: { id: medicalVisitId, petId },
        select: { id: true },
    });
    return visit ? { id: visit.id } : null;
}

export async function saveVaccination(input: unknown) {
    if (!await veterinarian()) return { success: false as const, error: "denied" as const };
    const parsed = vaccinationSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, error: "date" as const };
    const when = doseDates(parsed.data.administeredAt, parsed.data.nextDueAt);
    if ("error" in when) return { success: false as const, error: when.error };

    const pet = await prisma.pet.findUnique({
        where: { id: parsed.data.petId },
        select: {
            id: true,
            species: true,
            status: true,
            vaccinations: { select: { id: true, type: true, administeredAt: true } },
        },
    });
    if (!pet) return { success: false as const, error: "missing" as const };
    if (!parsed.data.recordId && pet.status !== "ACTIVE") return { success: false as const, error: "closed" as const };
    const visit = await visitOnPet(pet.id, parsed.data.recordId ? undefined : parsed.data.medicalVisitId);
    if (!visit) return { success: false as const, error: "visit" as const };

    const existing = pet.vaccinations.map((row) => ({
        id: row.id,
        type: row.type,
        administeredAt: row.administeredAt ? formatDateOnly(row.administeredAt) : null,
    }));
    const conflict = doseConflict(pet.species, existing, {
        id: parsed.data.recordId,
        type: parsed.data.type,
        administeredAt: parsed.data.administeredAt,
    });
    if (conflict) return { success: false as const, error: conflict };

    const annualsBefore = existing.filter((row) => row.type === "ANNUAL" && row.id !== parsed.data.recordId && row.administeredAt).length;
    const suggested = nextVaccineDue(pet.species, parsed.data.type, when.given, annualsBefore);
    const overridden = Boolean(when.due && suggested && formatDateOnly(suggested.dueAt) !== formatDateOnly(when.due));

    try {
        await prisma.$transaction(async (tx) => {
            const current = parsed.data.recordId
                ? await tx.vaccination.findFirst({ where: { id: parsed.data.recordId, petId: pet.id }, select: { id: true } })
                : null;
            if (parsed.data.recordId && !current) throw new Error("missing");
            const saved = current
                ? await tx.vaccination.update({
                    where: { id: current.id },
                    data: {
                        type: parsed.data.type,
                        administeredAt: when.given,
                        followUpCleared: !when.due,
                    },
                })
                : await tx.vaccination.create({
                    data: {
                        petId: pet.id,
                        type: parsed.data.type,
                        administeredAt: when.given,
                        followUpCleared: !when.due,
                        ...(visit.id ? { medicalVisitId: visit.id } : {}),
                    },
                });

            const [linked, open] = await Promise.all([
                tx.careReminder.findUnique({ where: { vaccinationId: saved.id }, select: { id: true, completedAt: true } }),
                tx.careReminder.findFirst({
                    where: { petId: pet.id, kind: "VACCINATION", completedAt: null },
                    select: { id: true },
                }),
            ]);
            const plan = planFollowUp({
                linked: linked ? { id: linked.id, open: linked.completedAt == null } : null,
                openForKind: open && open.id !== linked?.id ? open : linked?.completedAt == null ? open : null,
                nextDue: when.due,
            });
            await applyReminderPlan(tx, plan, {
                petId: pet.id,
                kind: "VACCINATION",
                due: when.due,
                dose: suggested?.dose ?? parsed.data.type,
                overridden,
                given: when.given,
                link: { vaccinationId: saved.id },
            });
        });
    } catch {
        return { success: false as const, error: "save" as const };
    }

    await refresh(pet.id, visit.id);
    return { success: true as const };
}

export async function saveTreatment(input: unknown) {
    if (!await veterinarian()) return { success: false as const, error: "denied" as const };
    const parsed = treatmentSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, error: "date" as const };
    const when = doseDates(parsed.data.administeredAt, parsed.data.nextDueAt);
    if ("error" in when) return { success: false as const, error: when.error };

    const pet = await prisma.pet.findUnique({
        where: { id: parsed.data.petId },
        select: { id: true, status: true },
    });
    if (!pet) return { success: false as const, error: "missing" as const };
    if (!parsed.data.recordId && pet.status !== "ACTIVE") return { success: false as const, error: "closed" as const };
    const visit = await visitOnPet(pet.id, parsed.data.recordId ? undefined : parsed.data.medicalVisitId);
    if (!visit) return { success: false as const, error: "visit" as const };
    const kind = parsed.data.type === "DEWORMING" ? "DEWORMING" as const : "FLEA_TREATMENT" as const;

    try {
        await prisma.$transaction(async (tx) => {
            const current = parsed.data.recordId
                ? await tx.treatment.findFirst({ where: { id: parsed.data.recordId, petId: pet.id }, select: { id: true } })
                : null;
            if (parsed.data.recordId && !current) throw new Error("missing");
            const saved = current
                ? await tx.treatment.update({
                    where: { id: current.id },
                    data: {
                        type: parsed.data.type,
                        administeredAt: when.given,
                        followUpCleared: !when.due,
                    },
                })
                : await tx.treatment.create({
                    data: {
                        petId: pet.id,
                        type: parsed.data.type,
                        administeredAt: when.given,
                        followUpCleared: !when.due,
                        ...(visit.id ? { medicalVisitId: visit.id } : {}),
                    },
                });

            const [linked, open] = await Promise.all([
                tx.careReminder.findUnique({ where: { treatmentId: saved.id }, select: { id: true, completedAt: true } }),
                tx.careReminder.findFirst({
                    where: { petId: pet.id, kind, completedAt: null },
                    select: { id: true },
                }),
            ]);
            const plan = planFollowUp({
                linked: linked ? { id: linked.id, open: linked.completedAt == null } : null,
                openForKind: open && open.id !== linked?.id ? open : linked?.completedAt == null ? open : null,
                nextDue: when.due,
            });
            await applyReminderPlan(tx, plan, {
                petId: pet.id,
                kind,
                due: when.due,
                dose: parsed.data.type,
                overridden: true,
                given: when.given,
                link: { treatmentId: saved.id },
            });
        });
    } catch {
        return { success: false as const, error: "save" as const };
    }

    await refresh(pet.id, visit.id);
    return { success: true as const };
}

const rescheduleSchema = z.object({
    id: z.string().min(1),
    dueAt: z.string(),
});

// Moves the same open reminder. It does not record a dose or open a second reminder.
export async function rescheduleCareReminder(input: unknown) {
    if (!await veterinarian()) return { success: false as const, error: "denied" as const };
    const parsed = rescheduleSchema.safeParse(input);
    const due = parsed.success ? dateOnlyUtc(parsed.data.dueAt) : null;
    if (!parsed.success || !due) return { success: false as const, error: "date" as const };

    const updated = await prisma.careReminder.updateMany({
        where: { id: parsed.data.id, completedAt: null },
        data: { dueAt: due, overridden: true },
    });
    if (updated.count !== 1) return { success: false as const, error: "missing" as const };

    const reminder = await prisma.careReminder.findUnique({
        where: { id: parsed.data.id },
        select: { petId: true },
    });
        if (reminder) await refresh(reminder.petId);
    else {
        revalidatePath("/admin/care");
        revalidatePath("/dashboard");
    }
    return { success: true as const };
}
