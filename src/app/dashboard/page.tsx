import { headers } from "next/headers";
import { redirect } from "next/navigation";
import OwnerDashboard from "@/components/dashboards/OwnerDashboard";
import StaffDashboard from "@/components/dashboards/StaffDashboard";
import { clinicDayRange, todayInBeirut } from "@/lib/appointments/availability";
import { auth } from "@/lib/auth/auth";
import { canSeeClinicalRecords } from "@/lib/auth/permissions";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { appointmentWithPetInclude } from "@/lib/types/appointments";
import { petCardSelect } from "@/lib/types/pets";

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session) redirect("/");

    const copy = messages(await getLocale());
    const role = session.user.role;

    if (role === "ADMIN" || role === "SECONDARY_ADMIN") {
        const { q = "" } = await searchParams;
        const query = q.trim();
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
                where: { userId: session.user.id },
                orderBy: { createdAt: "desc" },
                take: 20,
            }),
        ]);

        const toVisit = (visit: (typeof todayVisits)[number]) => ({
            id: visit.id,
            type: visit.type,
            startAt: visit.startAt,
            petName: visit.pet.name,
            ownerName: visit.owner.name,
            phone: visit.owner.phoneNumber,
        });

        return (
            <StaffDashboard
                copy={copy}
                clinical={clinical}
                query={query}
                today={todayVisits.map(toVisit)}
                upcoming={upcoming.map(toVisit)}
                matches={matches}
                reminders={reminders.map((reminder) => ({
                    id: reminder.id,
                    kind: reminder.kind,
                    dueAt: reminder.dueAt,
                    petName: reminder.pet.name,
                    ownerName: reminder.pet.owner.name,
                }))}
                pendingOrders={pendingOrders}
                lowStock={lowStock}
                notices={notices}
            />
        );
    }

    const [pets, appointments, reminders, notices] = await Promise.all([
        prisma.pet.findMany({
            where: { ownerId: session.user.id },
            select: petCardSelect,
        }),
        prisma.appointment.findMany({
            where: { ownerId: session.user.id, status: "BOOKED", startAt: { gte: new Date() } },
            orderBy: { startAt: "asc" },
            include: appointmentWithPetInclude,
        }),
        prisma.careReminder.findMany({
            where: { completedAt: null, pet: { ownerId: session.user.id } },
            orderBy: { dueAt: "asc" },
            include: { pet: { select: { name: true } } },
        }),
        prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 20,
        }),
    ]);

    const now = Date.now();
    const firstName = session.user.name.trim().split(/\s+/)[0];

    return (
        <OwnerDashboard
            pets={pets}
            ownerName={firstName}
            appointments={appointments}
            copy={copy}
            reminders={reminders.map((reminder) => ({
                id: reminder.id,
                kind: reminder.kind,
                dueAt: reminder.dueAt.toISOString(),
                petName: reminder.pet.name,
                overdue: reminder.dueAt.getTime() < now,
            }))}
            notices={notices.map((notice) => ({
                id: notice.id,
                title: notice.title,
                body: notice.body,
                readAt: notice.readAt?.toISOString() ?? null,
            }))}
        />
    );
}
