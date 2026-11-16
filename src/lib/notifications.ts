import { prisma } from "@/lib/prisma";
import { deliverPush } from "@/lib/notifications/push";

// dedupeKey is unique, so running the same booking or cron pass twice does not insert a second row.
export async function notify(userId: string, title: string, body: string, dedupeKey: string, href = "/dashboard") {
    try {
        await prisma.notification.create({ data: { userId, title, body, dedupeKey } });
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return;
        throw error;
    }
    try {
        await deliverPush(userId, title, body, href);
    } catch {
        // The in-app notice is already saved. A failed browser push must not undo it.
    }
}

export async function notifyOwnerAndStaff(
    ownerId: string,
    title: string,
    body: string,
    key: string,
    href: string | { owner?: string; staff?: string } = "/dashboard",
) {
    const ownerHref = typeof href === "string" ? href : href.owner ?? "/dashboard";
    const staffHref = typeof href === "string" ? href : href.staff ?? "/dashboard";
    const staff = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SECONDARY_ADMIN"] } },
        select: { id: true },
    });
    const userIds = new Set([ownerId, ...staff.map((person) => person.id)]);
    for (const userId of userIds) {
        await notify(userId, title, body, `${key}:${userId}`, userId === ownerId ? ownerHref : staffHref);
    }
}
