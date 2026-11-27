import { careTiming } from "@/lib/appointments/availability";
import { noticeHref } from "@/lib/notifications/href";
import { prisma } from "@/lib/prisma";
import { appointmentWithPetInclude } from "@/lib/types/appointments";
import { activePet } from "@/lib/pets/status";
import { petCardSelect } from "@/lib/types/pets";

// The owner's own pets, upcoming visits, care reminders, and notices.
export async function loadOwnerDashboard(userId: string, name: string) {
    const [pets, hiddenPets, appointments, reminders, notices] = await Promise.all([
        prisma.pet.findMany({
            where: { ownerId: userId, status: "ACTIVE" },
            select: petCardSelect,
        }),
        prisma.pet.groupBy({
            by: ["status"],
            where: { ownerId: userId, status: { in: ["ARCHIVED", "DECEASED"] } },
            _count: { _all: true },
        }),
        prisma.appointment.findMany({
            where: { ownerId: userId, status: "BOOKED", startAt: { gte: new Date() } },
            orderBy: { startAt: "asc" },
            include: appointmentWithPetInclude,
        }),
        prisma.careReminder.findMany({
            where: { completedAt: null, pet: { ownerId: userId, ...activePet } },
            orderBy: { dueAt: "asc" },
            include: { pet: { select: { id: true, name: true } } },
        }),
        prisma.notification.findMany({
            where: { userId, readAt: null },
            orderBy: { createdAt: "desc" },
            take: 20,
        }),
    ]);

    return {
        pets,
        hasArchivedPets: hiddenPets.some((row) => row.status === "ARCHIVED" && row._count._all > 0),
        hasPastPets: hiddenPets.some((row) => row.status === "DECEASED" && row._count._all > 0),
        ownerName: name.trim().split(/\s+/)[0],
        appointments,
        reminders: reminders.map((reminder) => ({
            id: reminder.id,
            kind: reminder.kind,
            dose: reminder.dose,
            dueAt: reminder.dueAt.toISOString(),
            petId: reminder.pet.id,
            petName: reminder.pet.name,
            status: careTiming(reminder.dueAt),
        })),
        notices: notices.map((notice) => ({
            id: notice.id,
            title: notice.title,
            body: notice.body,
            dedupeKey: notice.dedupeKey,
            href: noticeHref(notice.dedupeKey, "owner"),
            createdAt: notice.createdAt.toISOString(),
            readAt: notice.readAt?.toISOString() ?? null,
        })),
    };
}
