"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { beirutInstant, todayInBeirut } from "@/lib/appointments/availability";
import { orderedVisitServices } from "@/lib/appointments/labels";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { canCompleteClinical, canMarkGroomingDone, canMarkMissed } from "@/lib/visits/rules";
import type { AppointmentType, VisitService } from "../../../generated/prisma/client";

const notesSchema = z.string().trim().max(4000);
const visitServices = z.enum(["CHECKUP", "VACCINATION", "DEWORMING", "FLEA_TREATMENT", "FOLLOW_UP"]);

async function clinician() {
    try {
        return await requireRole(["ADMIN"]);
    } catch {
        return null;
    }
}

async function staff() {
    try {
        return await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        return null;
    }
}

function refresh(petId: string, visitId?: string) {
    revalidatePath("/dashboard");
    revalidatePath("/admin/appointments");
    revalidatePath(`/pets/${petId}`);
    revalidatePath(`/admin/patients/${petId}`);
    if (visitId) revalidatePath(`/pets/${petId}/visits/${visitId}`);
}

function walkInInstant(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayInBeirut()) return null;
    try {
        return beirutInstant(date, 12, 0);
    } catch {
        return null;
    }
}

function duplicateVisit(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function completeAppointment(appointmentId: string, notes: string) {
    if (!await clinician()) return { success: false as const, error: "denied" as const };
    const parsedId = z.uuid().safeParse(appointmentId);
    const parsedNotes = notesSchema.safeParse(notes);
    if (!parsedId.success || !parsedNotes.success) return { success: false as const, error: "notes" as const };

    try {
        const saved = await prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.findUnique({
                where: { id: parsedId.data },
                include: { medicalVisit: { select: { id: true } } },
            });
            if (!appointment) return { error: "closed" as const };
            if (appointment.medicalVisit) return { error: "exists" as const, visitId: appointment.medicalVisit.id, petId: appointment.petId };
            if (!canCompleteClinical(appointment.status, appointment.type)) return { error: "closed" as const };

            const updated = await tx.appointment.updateMany({
                where: { id: appointment.id, status: "BOOKED" },
                data: { status: "COMPLETED" },
            });
            if (updated.count !== 1) {
                const existing = await tx.medicalVisit.findUnique({ where: { appointmentId: appointment.id }, select: { id: true } });
                if (existing) return { error: "exists" as const, visitId: existing.id, petId: appointment.petId };
                return { error: "closed" as const };
            }

            const visit = await tx.medicalVisit.create({
                data: {
                    petId: appointment.petId,
                    appointmentId: appointment.id,
                    visitedAt: appointment.startAt,
                    notes: parsedNotes.data || null,
                    type: appointment.type,
                    services: appointment.type === "VETERINARY_VISIT" ? orderedVisitServices(appointment.services) : [],
                },
            });
            return { visitId: visit.id, petId: appointment.petId };
        });
        if ("error" in saved) {
            return {
                success: false as const,
                error: saved.error,
                visitId: "visitId" in saved ? saved.visitId : undefined,
                petId: "petId" in saved ? saved.petId : undefined,
            };
        }
        refresh(saved.petId, saved.visitId);
        revalidatePath(`/admin/appointments/${parsedId.data}`);
        return { success: true as const, visitId: saved.visitId, petId: saved.petId };
    } catch (error) {
        if (!duplicateVisit(error)) return { success: false as const, error: "closed" as const };
        const existing = await prisma.medicalVisit.findUnique({
            where: { appointmentId: parsedId.data },
            select: { id: true, petId: true },
        });
        if (!existing) return { success: false as const, error: "closed" as const };
        return { success: false as const, error: "exists" as const, visitId: existing.id, petId: existing.petId };
    }
}

export async function createWalkIn(input: { petId: string; date: string; type: "VETERINARY_VISIT" | "OPERATION"; services: VisitService[]; notes: string }) {
    if (!await clinician()) return { success: false as const, error: "denied" as const };
    const parsed = z.object({
        petId: z.uuid(),
        date: z.string(),
        type: z.enum(["VETERINARY_VISIT", "OPERATION"]),
        services: z.array(visitServices),
        notes: notesSchema,
    }).safeParse(input);
    if (!parsed.success) return { success: false as const, error: "notes" as const };
    const visitedAt = walkInInstant(parsed.data.date);
    if (!visitedAt) return { success: false as const, error: "date" as const };

    const pet = await prisma.pet.findUnique({ where: { id: parsed.data.petId }, select: { id: true } });
    if (!pet) return { success: false as const, error: "closed" as const };

    const visit = await prisma.medicalVisit.create({
        data: {
            petId: pet.id,
            visitedAt,
            notes: parsed.data.notes || null,
            type: parsed.data.type,
            services: parsed.data.type === "VETERINARY_VISIT" ? orderedVisitServices(parsed.data.services) : [],
        },
        select: { id: true },
    });
    refresh(pet.id, visit.id);
    return { success: true as const, visitId: visit.id, petId: pet.id };
}

export async function updateVisit(input: { visitId: string; notes: string; date?: string; type?: "VETERINARY_VISIT" | "OPERATION"; services?: VisitService[] }) {
    if (!await clinician()) return { success: false as const, error: "denied" as const };
    const parsed = z.object({
        visitId: z.uuid(),
        notes: notesSchema,
        date: z.string().optional(),
        type: z.enum(["VETERINARY_VISIT", "OPERATION"]).optional(),
        services: z.array(visitServices).optional(),
    }).safeParse(input);
    if (!parsed.success) return { success: false as const, error: "notes" as const };

    const visit = await prisma.medicalVisit.findUnique({
        where: { id: parsed.data.visitId },
        select: { id: true, petId: true, appointmentId: true },
    });
    if (!visit) return { success: false as const, error: "closed" as const };

    if (visit.appointmentId) {
        await prisma.medicalVisit.update({
            where: { id: visit.id },
            data: { notes: parsed.data.notes || null },
        });
    } else {
        const visitedAt = parsed.data.date ? walkInInstant(parsed.data.date) : null;
        if (parsed.data.date && !visitedAt) return { success: false as const, error: "date" as const };
        const type = parsed.data.type;
        await prisma.medicalVisit.update({
            where: { id: visit.id },
            data: {
                notes: parsed.data.notes || null,
                ...(visitedAt ? { visitedAt } : {}),
                ...(type ? { type, services: type === "VETERINARY_VISIT" ? orderedVisitServices(parsed.data.services ?? []) : [] } : {}),
            },
        });
    }
    refresh(visit.petId, visit.id);
    return { success: true as const, visitId: visit.id, petId: visit.petId };
}

export async function deleteVisit(visitId: string) {
    if (!await clinician()) return { success: false as const, error: "denied" as const };
    const parsed = z.uuid().safeParse(visitId);
    if (!parsed.success) return { success: false as const, error: "closed" as const };

    try {
        const removed = await prisma.$transaction(async (tx) => {
            const visit = await tx.medicalVisit.findUnique({
                where: { id: parsed.data },
                select: {
                    id: true,
                    petId: true,
                    appointmentId: true,
                    _count: { select: { vaccinations: true, treatments: true } },
                },
            });
            if (!visit) return { error: "closed" as const };
            if (visit._count.vaccinations > 0 || visit._count.treatments > 0) return { error: "blocked" as const };
            await tx.medicalVisit.delete({ where: { id: visit.id } });
            if (visit.appointmentId) {
                await tx.appointment.updateMany({
                    where: { id: visit.appointmentId, status: "COMPLETED" },
                    data: { status: "BOOKED" },
                });
            }
            return { petId: visit.petId };
        });
        if ("error" in removed) return { success: false as const, error: removed.error };
        refresh(removed.petId);
        return { success: true as const, petId: removed.petId };
    } catch {
        return { success: false as const, error: "closed" as const };
    }
}

export async function setAppointmentOutcome(appointmentId: string, outcome: "COMPLETED" | "EXPIRED") {
    if (!await staff()) return { success: false as const, error: "denied" as const };
    const parsed = z.uuid().safeParse(appointmentId);
    if (!parsed.success || (outcome !== "COMPLETED" && outcome !== "EXPIRED")) {
        return { success: false as const, error: "closed" as const };
    }

    const appointment = await prisma.appointment.findUnique({
        where: { id: parsed.data },
        select: { id: true, status: true, type: true, startAt: true, petId: true, medicalVisit: { select: { id: true } } },
    });
    if (!appointment || appointment.medicalVisit) return { success: false as const, error: "closed" as const };

    const allowed = outcome === "COMPLETED"
        ? canMarkGroomingDone(appointment.status, appointment.type)
        : canMarkMissed(appointment.status, appointment.startAt, new Date());
    if (!allowed) return { success: false as const, error: "closed" as const };

    const updated = await prisma.appointment.updateMany({
        where: { id: appointment.id, status: "BOOKED" },
        data: { status: outcome },
    });
    if (updated.count !== 1) return { success: false as const, error: "closed" as const };
    refresh(appointment.petId);
    revalidatePath(`/admin/appointments/${appointment.id}`);
    return { success: true as const };
}

export type VisitType = Extract<AppointmentType, "VETERINARY_VISIT" | "OPERATION">;
