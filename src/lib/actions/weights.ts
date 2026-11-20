"use server";

import { z } from "zod";
import { calendarDateInBeirut } from "@/lib/appointments/availability";
import { canRecordPetWeight } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { parseWeightKg, weightInstant, weightNotes } from "@/lib/pets/weight";
import { revalidatePet } from "@/lib/paths";
import { prisma } from "@/lib/prisma";

async function veterinarian() {
    try {
        const session = await requireRole(["ADMIN"]);
        return canRecordPetWeight(session.user.role) ? session : null;
    } catch {
        return null;
    }
}

async function refresh(petId: string) {
    await revalidatePet(petId);
}

export async function createPetWeight(input: { petId: string; weight: string; date: string; notes: string }) {
    if (!await veterinarian()) return { success: false as const, error: "denied" as const };
    const parsed = z.object({
        petId: z.uuid(),
        weight: z.string(),
        date: z.string(),
        notes: z.string(),
    }).safeParse(input);
    if (!parsed.success) return { success: false as const, error: "weight" as const };
    const weight = parseWeightKg(parsed.data.weight);
    const notes = weightNotes(parsed.data.notes);
    const recordedAt = weightInstant(parsed.data.date);
    if (weight === "invalid" || weight === null) return { success: false as const, error: "weight" as const };
    if (notes === "invalid") return { success: false as const, error: "notes" as const };
    if (!recordedAt) return { success: false as const, error: "date" as const };

    const pet = await prisma.pet.findUnique({ where: { id: parsed.data.petId }, select: { id: true } });
    if (!pet) return { success: false as const, error: "missing" as const };
    await prisma.petWeight.create({
        data: { petId: pet.id, weight, recordedAt, notes },
    });
    await refresh(pet.id);
    return { success: true as const };
}

export async function updatePetWeight(input: { id: string; weight: string; date: string; notes: string }) {
    if (!await veterinarian()) return { success: false as const, error: "denied" as const };
    const parsed = z.object({
        id: z.uuid(),
        weight: z.string(),
        date: z.string(),
        notes: z.string(),
    }).safeParse(input);
    if (!parsed.success) return { success: false as const, error: "weight" as const };
    const weight = parseWeightKg(parsed.data.weight);
    const notes = weightNotes(parsed.data.notes);
    if (weight === "invalid" || weight === null) return { success: false as const, error: "weight" as const };
    if (notes === "invalid") return { success: false as const, error: "notes" as const };

    const current = await prisma.petWeight.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, petId: true, medicalVisit: { select: { visitedAt: true } } },
    });
    if (!current) return { success: false as const, error: "missing" as const };

    if (current.medicalVisit) {
        if (parsed.data.date !== calendarDateInBeirut(current.medicalVisit.visitedAt)) {
            return { success: false as const, error: "visitDate" as const };
        }
        await prisma.petWeight.update({
            where: { id: current.id },
            data: { weight, notes },
        });
    } else {
        const recordedAt = weightInstant(parsed.data.date);
        if (!recordedAt) return { success: false as const, error: "date" as const };
        await prisma.petWeight.update({
            where: { id: current.id },
            data: { weight, notes, recordedAt },
        });
    }
    await refresh(current.petId);
    return { success: true as const };
}

export async function deletePetWeight(id: string) {
    if (!await veterinarian()) return { success: false as const, error: "denied" as const };
    const parsed = z.uuid().safeParse(id);
    if (!parsed.success) return { success: false as const, error: "missing" as const };
    const current = await prisma.petWeight.findUnique({ where: { id: parsed.data }, select: { id: true, petId: true } });
    if (!current) return { success: false as const, error: "missing" as const };
    await prisma.petWeight.delete({ where: { id: current.id } });
    await refresh(current.petId);
    return { success: true as const };
}
