// Staff pages share these queries. The dashboard only asks for today's visits and the counts it summarizes.

import { beirutInstant, clinicDayRange, todayInBeirut } from "@/lib/appointments/availability";
import { canSeeClinicalRecords } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { stockState } from "@/lib/shop/inventory";
import { followUpBuckets } from "@/lib/visits/follow-up";
import { pageKey } from "@/lib/slug";
import type { AppointmentType, GroomingService, VisitService } from "../../../../generated/prisma/client";

export type StaffVisit = {
    id: string;
    petId: string;
    petSlug: string;
    type: AppointmentType;
    services: VisitService[];
    groomingService: GroomingService | null;
    startAt: Date;
    petName: string;
    ownerId: string;
    ownerName: string;
    phone: string;
    cancelledAt?: Date;
};

export type StaffReminder = {
    id: string;
    kind: string;
    dose: string | null;
    dueAt: Date;
    petId: string;
    petSlug: string;
    petName: string;
    ownerId: string;
    ownerName: string;
    species: "CAT" | "DOG";
    annualsBefore: number;
};

export type FollowUpCounts = {
    overdue: number;
    due: number;
    upcoming: number;
};

const visitInclude = {
    pet: { select: { id: true, slug: true, name: true } },
    owner: { select: { id: true, name: true, phoneNumber: true } },
} as const;

function toVisit(visit: {
    id: string;
    type: AppointmentType;
    services: VisitService[];
    groomingService: GroomingService | null;
    startAt: Date;
    pet: { id: string; slug: string | null; name: string };
    owner: { id: string; name: string; phoneNumber: string };
}): StaffVisit {
    return {
        id: visit.id,
        petId: visit.pet.id,
        petSlug: pageKey(visit.pet),
        type: visit.type,
        services: visit.services,
        groomingService: visit.groomingService,
        startAt: visit.startAt,
        petName: visit.pet.name,
        ownerId: visit.owner.id,
        ownerName: visit.owner.name,
        phone: visit.owner.phoneNumber,
    };
}

export async function loadStaffDashboard(role: string) {
    const range = clinicDayRange(todayInBeirut());
    const clinical = canSeeClinicalRecords(role);
    const todayStart = beirutInstant(todayInBeirut(), 0, 0);

    const [todayVisits, pendingOrders, lowStock, overdueCare, awaitingCount, pendingFollowUps] = await Promise.all([
        range
            ? prisma.appointment.findMany({
                where: { status: "BOOKED", startAt: { gte: range.open, lt: range.close } },
                orderBy: { startAt: "asc" },
                include: visitInclude,
            })
            : [],
        prisma.shopOrder.count({ where: { status: "PENDING" } }),
        prisma.productVariant.findMany({ select: { stock: true, lowStockAt: true } }),
        clinical
            ? prisma.careReminder.count({ where: { completedAt: null, dueAt: { lt: todayStart } } })
            : 0,
        prisma.appointment.count({ where: { status: "BOOKED", startAt: { lt: new Date() } } }),
        clinical
            ? prisma.visitFollowUp.findMany({
                where: { status: "PENDING" },
                select: { status: true, dueOn: true },
            })
            : [],
    ]);

    return {
        clinical,
        today: todayVisits.map(toVisit),
        pendingOrders,
        lowStock: lowStock.filter((variant) => stockState(variant.stock, variant.lowStockAt) === "low").length,
        overdueCare,
        awaitingCount,
        followUps: (() => {
            const groups = followUpBuckets(pendingFollowUps);
            return { overdue: groups.overdue.length, due: groups.due.length, upcoming: groups.upcoming.length };
        })(),
    };
}

export async function loadStaffAppointments() {
    const range = clinicDayRange(todayInBeirut());
    const now = new Date();
    const [todayVisits, upcoming, awaiting] = await Promise.all([
        range
            ? prisma.appointment.findMany({
                where: { status: "BOOKED", startAt: { gte: range.open, lt: range.close } },
                orderBy: { startAt: "asc" },
                include: visitInclude,
            })
            : [],
        prisma.appointment.findMany({
            where: { status: "BOOKED", startAt: { gte: now } },
            orderBy: { startAt: "asc" },
            take: 30,
            include: visitInclude,
        }),
        prisma.appointment.findMany({
            where: { status: "BOOKED", startAt: { lt: now } },
            orderBy: { startAt: "asc" },
            include: visitInclude,
        }),
    ]);
    return {
        today: todayVisits.map(toVisit),
        upcoming: upcoming.map(toVisit),
        awaiting: awaiting.map(toVisit),
    };
}

export async function loadCancelledAppointments() {
    const range = clinicDayRange(todayInBeirut());
    if (!range) return [];
    const visits = await prisma.appointment.findMany({
        where: { status: "CANCELLED", startAt: { gte: range.open } },
        orderBy: { updatedAt: "desc" },
        include: visitInclude,
    });
    return visits.map((visit) => ({ ...toVisit(visit), cancelledAt: visit.updatedAt }));
}

export async function findStaffVisit(id: string) {
    const visit = await prisma.appointment.findUnique({ where: { id }, include: visitInclude });
    return visit ? toVisit(visit) : null;
}

export async function loadAppointmentsBetween(start: Date, end: Date) {
    const visits = await prisma.appointment.findMany({
        where: { status: "BOOKED", startAt: { gte: start, lt: end } },
        orderBy: { startAt: "asc" },
        include: visitInclude,
    });
    return visits.map(toVisit);
}

const pageSize = 10;

export async function loadPatients(rawQuery: string, rawPage: string | undefined) {
    const query = rawQuery.trim();
    const where = query
        ? {
            OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { owner: { name: { contains: query, mode: "insensitive" as const } } },
                { owner: { phoneNumber: { contains: query } } },
            ],
        }
        : {};
    const total = await prisma.pet.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const requested = Number.parseInt(rawPage ?? "1", 10);
    const page = Number.isFinite(requested) ? Math.min(Math.max(1, requested), pages) : 1;
    const pets = await prisma.pet.findMany({
        where,
        select: {
            id: true,
            slug: true,
            name: true,
            species: true,
            breed: true,
            owner: { select: { id: true, name: true, phoneNumber: true } },
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
    });
    return { query, pets, page, pages };
}

export async function loadCareReminders() {
    const reminders = await prisma.careReminder.findMany({
        where: { completedAt: null },
        orderBy: { dueAt: "asc" },
        include: {
            pet: {
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    species: true,
                    owner: { select: { id: true, name: true, phoneNumber: true } },
                    vaccinations: { where: { type: "ANNUAL", administeredAt: { not: null } }, select: { id: true } },
                },
            },
        },
    });
    return reminders.map((reminder) => ({
        id: reminder.id,
        kind: reminder.kind,
        dose: reminder.dose,
        dueAt: reminder.dueAt,
        petId: reminder.pet.id,
        petSlug: pageKey(reminder.pet),
        petName: reminder.pet.name,
        ownerId: reminder.pet.owner.id,
        ownerName: reminder.pet.owner.name,
        phone: reminder.pet.owner.phoneNumber,
        species: reminder.pet.species,
        annualsBefore: reminder.pet.vaccinations.length,
    }));
}

export async function loadLowStock() {
    const variants = await prisma.productVariant.findMany({
        select: {
            id: true,
            label: true,
            labelAr: true,
            stock: true,
            lowStockAt: true,
            product: { select: { id: true, name: true, nameAr: true, slug: true } },
        },
        orderBy: { stock: "asc" },
    });
    return variants.filter((variant) => stockState(variant.stock, variant.lowStockAt) === "low").slice(0, 20);
}
