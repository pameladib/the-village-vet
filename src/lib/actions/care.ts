"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { todayInBeirut } from "@/lib/appointments/availability";
import { requireRole } from "@/lib/auth/session";
import { dateOnlyUtc, doseConflict, formatDateOnly, nextVaccineDue, planFollowUp } from "@/lib/clinic/vaccines";
import { prisma } from "@/lib/prisma";

const vaccinationSchema = z.object({
    petId: z.string().min(1),
    recordId: z.string().min(1).optional(),
    type: z.enum(["FIRST", "SECOND", "THIRD", "ANNUAL"]),
    administeredAt: z.string(),
    nextDueAt: z.string(),
});

const treatmentSchema = z.object({
    petId: z.string().min(1),
    recordId: z.string().min(1).optional(),
    type: z.enum(["DEWORMING", "FLEA_TICK"]),
    administeredAt: z.string(),
    nextDueAt: z.string(),
});

function dates(administeredAt: string, nextDueAt: string) {
    const given = dateOnlyUtc(administeredAt);
    if (!given || administeredAt > todayInBeirut()) return { error: "date" as const };
    if (!nextDueAt) return { given, due: null };
    const due = dateOnlyUtc(nextDueAt);
    if (!due || nextDueAt < administeredAt) return { error: "due" as const };
    return { given, due };
}

async function veterinarian() {
    try {
        return await requireRole(["ADMIN"]);
    } catch {
        return null;
    }
}

function refresh(petId: string) {
    revalidatePath(`/pets/${petId}`);
    revalidatePath("/dashboard");
    revalidatePath("/admin/care");
}

export async function saveVaccination(input: unknown) {
    if (!await veterinarian()) return { success: false as const, error: "denied" as const };
    const parsed = vaccinationSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, error: "date" as const };
    const when = dates(parsed.data.administeredAt, parsed.data.nextDueAt);
    if ("error" in when) return { success: false as const, error: when.error };

    const pet = await prisma.pet.findUnique({
        where: { id: parsed.data.petId },
        select: {
            id: true,
            species: true,
            vaccinations: { select: { id: true, type: true, administeredAt: true } },
        },
    });
    if (!pet) return { success: false as const, error: "missing" as const };

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
            const dose = suggested?.dose ?? parsed.data.type;
            if (plan.type === "delete") await tx.careReminder.delete({ where: { id: plan.id } });
            if (plan.type === "update" && when.due) {
                await tx.careReminder.update({
                    where: { id: plan.id },
                    data: { dueAt: when.due, dose, overridden },
                });
            }
            if (plan.type === "complete") {
                await tx.careReminder.update({ where: { id: plan.id }, data: { completedAt: when.given } });
            }
            if (plan.type === "replace") {
                await tx.careReminder.update({ where: { id: plan.completeId }, data: { completedAt: when.given } });
            }
            if ((plan.type === "create" || plan.type === "replace") && when.due) {
                await tx.careReminder.create({
                    data: {
                        petId: pet.id,
                        kind: "VACCINATION",
                        dueAt: when.due,
                        dose,
                        overridden,
                        vaccinationId: saved.id,
                    },
                });
            }
        });
    } catch {
        return { success: false as const, error: "save" as const };
    }

    refresh(pet.id);
    return { success: true as const };
}

export async function saveTreatment(input: unknown) {
    if (!await veterinarian()) return { success: false as const, error: "denied" as const };
    const parsed = treatmentSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, error: "date" as const };
    const when = dates(parsed.data.administeredAt, parsed.data.nextDueAt);
    if ("error" in when) return { success: false as const, error: when.error };

    const pet = await prisma.pet.findUnique({
        where: { id: parsed.data.petId },
        select: { id: true },
    });
    if (!pet) return { success: false as const, error: "missing" as const };
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
            if (plan.type === "delete") await tx.careReminder.delete({ where: { id: plan.id } });
            if (plan.type === "update" && when.due) {
                await tx.careReminder.update({
                    where: { id: plan.id },
                    data: { dueAt: when.due, dose: parsed.data.type, overridden: true },
                });
            }
            if (plan.type === "complete") {
                await tx.careReminder.update({ where: { id: plan.id }, data: { completedAt: when.given } });
            }
            if (plan.type === "replace") {
                await tx.careReminder.update({ where: { id: plan.completeId }, data: { completedAt: when.given } });
            }
            if ((plan.type === "create" || plan.type === "replace") && when.due) {
                await tx.careReminder.create({
                    data: {
                        petId: pet.id,
                        kind,
                        dueAt: when.due,
                        dose: parsed.data.type,
                        overridden: true,
                        treatmentId: saved.id,
                    },
                });
            }
        });
    } catch {
        return { success: false as const, error: "save" as const };
    }

    refresh(pet.id);
    return { success: true as const };
}
