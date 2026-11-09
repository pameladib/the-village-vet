import { prisma } from "@/lib/prisma";
import { appointmentWithPetInclude } from "@/lib/types/appointments";
import { petCardSelect } from "@/lib/types/pets";

// The owner's own pets, upcoming visits, care reminders, and notices.
export async function loadOwnerDashboard(userId: string, name: string) {
    const [pets, appointments, reminders, notices] = await Promise.all([
        prisma.pet.findMany({
            where: { ownerId: userId },
            select: petCardSelect,
        }),
        prisma.appointment.findMany({
            where: { ownerId: userId, status: "BOOKED", startAt: { gte: new Date() } },
            orderBy: { startAt: "asc" },
            include: appointmentWithPetInclude,
        }),
        prisma.careReminder.findMany({
            where: { completedAt: null, pet: { ownerId: userId } },
            orderBy: { dueAt: "asc" },
            include: { pet: { select: { name: true } } },
        }),
        prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 20,
        }),
    ]);

    const now = Date.now();

    return {
        pets,
        ownerName: name.trim().split(/\s+/)[0],
        appointments,
        reminders: reminders.map((reminder) => ({
            id: reminder.id,
            kind: reminder.kind,
            dueAt: reminder.dueAt.toISOString(),
            petName: reminder.pet.name,
            overdue: reminder.dueAt.getTime() < now,
        })),
        notices: notices.map((notice) => ({
            id: notice.id,
            title: notice.title,
            body: notice.body,
            readAt: notice.readAt?.toISOString() ?? null,
        })),
    };
}
