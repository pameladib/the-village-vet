import { todayInBeirut } from "@/lib/appointments/availability";
import { dateOnlyUtc, doseConflict, formatDateOnly, nextVaccineDue, planFollowUp, type FollowUpPlan } from "@/lib/clinic/vaccines";
import type { Prisma } from "../../../generated/prisma/client";

type Tx = Prisma.TransactionClient;

export function doseDates(administeredAt: string, nextDueAt: string) {
    const given = dateOnlyUtc(administeredAt);
    if (!given || administeredAt > todayInBeirut()) return { error: "date" as const };
    if (!nextDueAt) return { given, due: null };
    const due = dateOnlyUtc(nextDueAt);
    if (!due || nextDueAt < administeredAt) return { error: "due" as const };
    return { given, due };
}

function rollback(code: "duplicate" | "annualDate" | "species" | "due" | "doseDate"): never {
    throw new Error("visit-care", { cause: code });
}

export async function applyReminderPlan(tx: Tx, plan: FollowUpPlan, row: {
    petId: string;
    kind: "VACCINATION" | "DEWORMING" | "FLEA_TREATMENT";
    due: Date | null;
    dose: string;
    overridden: boolean;
    given: Date;
    link: { vaccinationId: string } | { treatmentId: string };
}) {
    if (plan.type === "delete") await tx.careReminder.delete({ where: { id: plan.id } });
    if (plan.type === "update" && row.due) {
        await tx.careReminder.update({
            where: { id: plan.id },
            data: { dueAt: row.due, dose: row.dose, overridden: row.overridden },
        });
    }
    if (plan.type === "complete") {
        await tx.careReminder.update({ where: { id: plan.id }, data: { completedAt: row.given } });
    }
    if (plan.type === "replace") {
        await tx.careReminder.update({ where: { id: plan.completeId }, data: { completedAt: row.given } });
    }
    if ((plan.type === "create" || plan.type === "replace") && row.due) {
        await tx.careReminder.create({
            data: {
                petId: row.petId,
                kind: row.kind,
                dueAt: row.due,
                dose: row.dose,
                overridden: row.overridden,
                ...row.link,
            },
        });
    }
}

export async function addVisitVaccination(tx: Tx, input: {
    petId: string;
    medicalVisitId: string;
    type: "FIRST" | "SECOND" | "THIRD" | "ANNUAL";
    administeredAt: string;
    nextDueAt: string;
}) {
    const when = doseDates(input.administeredAt, input.nextDueAt);
    if ("error" in when) rollback(when.error === "date" ? "doseDate" : "due");
    if (when.due && formatDateOnly(when.due) < todayInBeirut()) rollback("due");
    const pet = await tx.pet.findUnique({
        where: { id: input.petId },
        select: { id: true, species: true, vaccinations: { select: { id: true, type: true, administeredAt: true } } },
    });
    if (!pet) rollback("doseDate");
    const existing = pet.vaccinations.map((row) => ({
        id: row.id,
        type: row.type,
        administeredAt: row.administeredAt ? formatDateOnly(row.administeredAt) : null,
    }));
    const conflict = doseConflict(pet.species, existing, { type: input.type, administeredAt: input.administeredAt });
    if (conflict) rollback(conflict);
    const annualsBefore = existing.filter((row) => row.type === "ANNUAL" && row.administeredAt).length;
    const suggested = nextVaccineDue(pet.species, input.type, when.given, annualsBefore);
    const overridden = Boolean(when.due && suggested && formatDateOnly(suggested.dueAt) !== formatDateOnly(when.due));
    const saved = await tx.vaccination.create({
        data: {
            petId: pet.id,
            type: input.type,
            administeredAt: when.given,
            followUpCleared: !when.due,
            medicalVisitId: input.medicalVisitId,
        },
    });
    const open = await tx.careReminder.findFirst({
        where: { petId: pet.id, kind: "VACCINATION", completedAt: null },
        select: { id: true },
    });
    await applyReminderPlan(tx, planFollowUp({ linked: null, openForKind: open, nextDue: when.due }), {
        petId: pet.id,
        kind: "VACCINATION",
        due: when.due,
        dose: suggested?.dose ?? input.type,
        overridden,
        given: when.given,
        link: { vaccinationId: saved.id },
    });
}

export async function addVisitTreatment(tx: Tx, input: {
    petId: string;
    medicalVisitId: string;
    type: "DEWORMING" | "FLEA_TICK";
    administeredAt: string;
    nextDueAt: string;
}) {
    const when = doseDates(input.administeredAt, input.nextDueAt);
    if ("error" in when) rollback(when.error === "date" ? "doseDate" : "due");
    if (when.due && formatDateOnly(when.due) < todayInBeirut()) rollback("due");
    const pet = await tx.pet.findUnique({ where: { id: input.petId }, select: { id: true } });
    if (!pet) rollback("doseDate");
    const kind = input.type === "DEWORMING" ? "DEWORMING" as const : "FLEA_TREATMENT" as const;
    const saved = await tx.treatment.create({
        data: {
            petId: pet.id,
            type: input.type,
            administeredAt: when.given,
            followUpCleared: !when.due,
            medicalVisitId: input.medicalVisitId,
        },
    });
    const open = await tx.careReminder.findFirst({
        where: { petId: pet.id, kind, completedAt: null },
        select: { id: true },
    });
    await applyReminderPlan(tx, planFollowUp({ linked: null, openForKind: open, nextDue: when.due }), {
        petId: pet.id,
        kind,
        due: when.due,
        dose: input.type,
        overridden: true,
        given: when.given,
        link: { treatmentId: saved.id },
    });
}
