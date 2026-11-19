import type { Prisma } from "../../../generated/prisma/client";
import { visitWeightPlan } from "./weight";

export async function writeVisitWeight(
    tx: Prisma.TransactionClient,
    input: { petId: string; visitId: string; visitedAt: Date; raw: string },
) {
    const existing = await tx.petWeight.findUnique({ where: { medicalVisitId: input.visitId }, select: { id: true } });
    const plan = visitWeightPlan(Boolean(existing), input.raw);
    if (plan.action === "invalid") throw new Error("weight");
    if (plan.action === "none") return;
    if (plan.action === "delete" && existing) {
        await tx.petWeight.delete({ where: { id: existing.id } });
        return;
    }
    if (plan.action === "create") {
        await tx.petWeight.create({
            data: { petId: input.petId, medicalVisitId: input.visitId, weight: plan.weight, recordedAt: input.visitedAt },
        });
        return;
    }
    if (plan.action === "update" && existing) {
        await tx.petWeight.update({
            where: { id: existing.id },
            data: { weight: plan.weight, recordedAt: input.visitedAt },
        });
    }
}
