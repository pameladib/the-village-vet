"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { bookingSchema, openingsSchema } from "@/lib/validations/appointment";
import {
    appointmentDuration,
    clinicDayRange,
    getAvailableStarts,
} from "@/lib/appointments/availability";
import type { AppointmentType, Species, UserRole } from "../../../generated/prisma/client";
import { orderedVisitServices } from "@/lib/appointments/labels";
import { notifyOwnerAndStaff } from "@/lib/notifications";

const BOOKING_ROLES = ["OWNER", "ADMIN", "SECONDARY_ADMIN"] as const satisfies readonly UserRole[];

async function bookingSession() {
    try {
        return await requireRole([...BOOKING_ROLES]);
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message === "User is not authenticated" ||
                error.message === "User does not have the required role")
        ) {
            return null;
        }
        throw error;
    }
}

function petWhere(userId: string, role: UserRole, petId: string) {
    return role === "OWNER" ? { id: petId, ownerId: userId } : { id: petId };
}

// One clinic, so one lock is enough. It is held until the transaction ends, so two bookings cannot take the same slot.
const SCHEDULE_LOCK = 481516234;

type ScheduleDb = {
    appointment: typeof prisma.appointment;
    scheduleBlock: typeof prisma.scheduleBlock;
};

// Only visits that can overlap this clinic day. A visit is at most 2 hours, so we look 2 hours before opening.
async function loadSchedule(db: ScheduleDb, date: string) {
    const range = clinicDayRange(date);
    if (!range) return { appointments: [], blocks: [] };

    const earliest = new Date(range.open.getTime() - 2 * 60 * 60_000);
    const appointments = await db.appointment.findMany({
        where: {
            status: "BOOKED",
            startAt: { gte: earliest, lt: range.close },
        },
    });
    const blocks = await db.scheduleBlock.findMany({
        where: {
            startAt: { lt: range.close },
            endAt: { gt: range.open },
        },
    });
    return { appointments, blocks };
}

function openingsFor(
    type: AppointmentType,
    species: Species,
    date: string,
    schedule: Awaited<ReturnType<typeof loadSchedule>>,
) {
    return getAvailableStarts(type, species, date, schedule.appointments, schedule.blocks);
}

export async function getOpenings(input: { petId: string; type: AppointmentType; date: string }) {
    const session = await bookingSession();
    if (!session) return { success: false as const, formErrors: ["You need to sign in."], starts: [], duration: 0 };

    const parsed = openingsSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false as const,
            errors: z.flattenError(parsed.error).fieldErrors,
            formErrors: z.flattenError(parsed.error).formErrors,
            starts: [],
            duration: 0,
        };
    }

    const pet = await prisma.pet.findFirst({
        where: petWhere(session.user.id, session.user.role, parsed.data.petId),
        select: { species: true },
    });
    if (!pet) return { success: false as const, formErrors: ["We couldn't find this pet."], starts: [], duration: 0 };

    const schedule = await loadSchedule(prisma, parsed.data.date);
    const starts = openingsFor(parsed.data.type, pet.species, parsed.data.date, schedule);
    return {
        success: true as const,
        starts: starts.map((start) => start.toISOString()),
        duration: appointmentDuration(parsed.data.type, pet.species),
        formErrors: [],
    };
}

export async function bookAppointment(data: unknown) {
    const session = await bookingSession();
    if (!session) return { success: false as const, formErrors: ["You need to sign in."] };

    const parsed = bookingSchema.safeParse(data);
    if (!parsed.success) {
        return {
            success: false as const,
            errors: z.flattenError(parsed.error).fieldErrors,
            formErrors: z.flattenError(parsed.error).formErrors,
        };
    }

    const chosen = new Date(parsed.data.start);
    try {
        const created = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SCHEDULE_LOCK})`;

            const pet = await tx.pet.findFirst({
                where: petWhere(session.user.id, session.user.role, parsed.data.petId),
                select: { id: true, species: true, ownerId: true },
            });
            if (!pet) return { error: "We couldn't find this pet." } as const;

            const schedule = await loadSchedule(tx, parsed.data.date);
            const starts = openingsFor(parsed.data.type, pet.species, parsed.data.date, schedule);
            const stillOpen = starts.some((start) => start.getTime() === chosen.getTime());
            if (!stillOpen) return { error: "That time is no longer available." } as const;

            const appointment = await tx.appointment.create({
                data: {
                    type: parsed.data.type,
                    services: parsed.data.type === "VETERINARY_VISIT" ? orderedVisitServices(parsed.data.services) : [],
                    startAt: chosen,
                    duration: appointmentDuration(parsed.data.type, pet.species),
                    groomingService: parsed.data.type === "GROOMING" ? parsed.data.groomingService ?? null : null,
                    ownerId: pet.ownerId,
                    petId: pet.id,
                },
            });
            return { appointment } as const;
        });

        if ("error" in created) return { success: false as const, formErrors: [created.error] };

        try {
            await notifyOwnerAndStaff(
                created.appointment.ownerId,
                "Appointment booked",
                "A visit was booked. Open the dashboard to see the time.",
                `booked:${created.appointment.id}`,
            );
        } catch {
            // The visit is already saved. A failed notice must not look like a failed booking.
        }
    } catch {
        return { success: false as const, formErrors: ["Could not book this appointment."] };
    }

    revalidatePath("/dashboard");
    return { success: true as const };
}

// An owner can cancel until the visit starts. There is no cancellation fee in the clinic rules we have.
export async function cancelAppointment(appointmentId: string) {
    const session = await bookingSession();
    if (!session) return { success: false as const, formErrors: ["You need to sign in."] };

    const parsed = z.uuid().safeParse(appointmentId);
    if (!parsed.success) return { success: false as const, formErrors: ["We couldn't find this appointment."] };

    const existing = await prisma.appointment.findFirst({
        where: session.user.role === "OWNER"
            ? { id: parsed.data, ownerId: session.user.id, status: "BOOKED" }
            : { id: parsed.data, status: "BOOKED" },
        select: { id: true, ownerId: true, startAt: true },
    });
    if (!existing || existing.startAt <= new Date()) {
        return { success: false as const, formErrors: ["This appointment can no longer be cancelled."] };
    }

    await prisma.appointment.update({
        where: { id: existing.id },
        data: { status: "CANCELLED" },
    });

    try {
        await notifyOwnerAndStaff(
            existing.ownerId,
            "Appointment cancelled",
            "A visit was cancelled.",
            `cancelled:${existing.id}`,
        );
    } catch {
        // The cancellation is saved even if the notice fails.
    }

    revalidatePath("/dashboard");
    return { success: true as const };
}

const rescheduleSchema = z.object({
    appointmentId: z.uuid(),
    date: z.iso.date(),
    start: z.iso.datetime(),
});

export async function rescheduleAppointment(input: { appointmentId: string; date: string; start: string }) {
    const session = await bookingSession();
    if (!session) return { success: false as const, formErrors: ["You need to sign in."] };

    const parsed = rescheduleSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Choose a valid time."] };

    const chosen = new Date(parsed.data.start);
    try {
        const moved = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SCHEDULE_LOCK})`;
            const current = await tx.appointment.findFirst({
                where: session.user.role === "OWNER"
                    ? { id: parsed.data.appointmentId, ownerId: session.user.id, status: "BOOKED" }
                    : { id: parsed.data.appointmentId, status: "BOOKED" },
                include: { pet: { select: { species: true } } },
            });
            if (!current || current.startAt <= new Date()) return { error: "This appointment can no longer be changed." } as const;

            const schedule = await loadSchedule(tx, parsed.data.date);
            const others = {
                ...schedule,
                appointments: schedule.appointments.filter((appointment) => appointment.id !== current.id),
            };
            const starts = openingsFor(current.type, current.pet.species, parsed.data.date, others);
            if (!starts.some((start) => start.getTime() === chosen.getTime())) {
                return { error: "That time is no longer available." } as const;
            }

            const appointment = await tx.appointment.update({
                where: { id: current.id },
                data: {
                    startAt: chosen,
                    duration: appointmentDuration(current.type, current.pet.species),
                },
            });
            return { appointment } as const;
        });
        if ("error" in moved) return { success: false as const, formErrors: [moved.error] };
        try {
            await notifyOwnerAndStaff(
                moved.appointment.ownerId,
                "Appointment rescheduled",
                "A visit was moved to a new time.",
                `rescheduled:${moved.appointment.id}:${moved.appointment.startAt.toISOString()}`,
            );
        } catch {
            // The new time is saved even if the notice fails.
        }
    } catch {
        return { success: false as const, formErrors: ["Could not change this appointment."] };
    }

    revalidatePath("/dashboard");
    return { success: true as const };
}
