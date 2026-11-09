import { clinicDayRange, todayInBeirut } from "@/lib/appointments/availability";
import { canSeeClinicalRecords } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

// Clinic-wide dashboard for the veterinarian and the assistant.
export async function loadStaffDashboard(userId: string, role: string, rawQuery: string) {
    const query = rawQuery.trim();
    const today = todayInBeirut();
    const range = clinicDayRange(today);
    const clinical = canSeeClinicalRecords(role);
    const now = new Date();

    const [todayVisits, upcoming, matches, reminders, pendingOrders, lowStock, notices] = await Promise.all([
        range
            ? prisma.appointment.findMany({
                where: { status: "BOOKED", startAt: { gte: range.open, lt: range.close } },
                orderBy: { startAt: "asc" },
                include: { pet: { select: { name: true } }, owner: { select: { name: true, phoneNumber: true } } },
            })
            : [],
        prisma.appointment.findMany({
            where: { status: "BOOKED", startAt: { gte: now } },
            orderBy: { startAt: "asc" },
            take: 30,
            include: { pet: { select: { name: true } }, owner: { select: { name: true, phoneNumber: true } } },
        }),
        query.length >= 2
            ? prisma.user.findMany({
                where: {
                    role: "OWNER",
                    OR: [
                        { name: { contains: query, mode: "insensitive" } },
                        { phoneNumber: { contains: query } },
                        { pets: { some: { name: { contains: query, mode: "insensitive" } } } },
                    ],
                },
                select: { id: true, name: true, phoneNumber: true, pets: { select: { id: true, name: true } } },
                take: 20,
            })
            : [],
        clinical
            ? prisma.careReminder.findMany({
                where: { completedAt: null },
                orderBy: { dueAt: "asc" },
                take: 40,
                include: { pet: { select: { name: true, owner: { select: { name: true } } } } },
            })
            : [],
        prisma.shopOrder.count({ where: { status: "PENDING" } }),
        prisma.product.findMany({
            where: { stock: { lte: 2 } },
            select: { id: true, name: true, stock: true },
            orderBy: { stock: "asc" },
            take: 20,
        }),
        prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 20,
        }),
    ]);

    const toVisit = (visit: (typeof todayVisits)[number]) => ({
        id: visit.id,
        type: visit.type,
        services: visit.services,
        groomingService: visit.groomingService,
        startAt: visit.startAt,
        petName: visit.pet.name,
        ownerName: visit.owner.name,
        phone: visit.owner.phoneNumber,
    });

    return {
        clinical,
        query,
        today: todayVisits.map(toVisit),
        upcoming: upcoming.map(toVisit),
        matches,
        reminders: reminders.map((reminder) => ({
            id: reminder.id,
            kind: reminder.kind,
            dueAt: reminder.dueAt,
            petName: reminder.pet.name,
            ownerName: reminder.pet.owner.name,
        })),
        pendingOrders,
        lowStock,
        notices,
    };
}
