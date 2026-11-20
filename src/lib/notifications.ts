import { messages, type Locale } from "@/lib/i18n";
import { savedLocale } from "@/lib/locale-preference";
import { presentNotice } from "@/lib/notifications/present";
import { prisma } from "@/lib/prisma";
import { deliverPush } from "@/lib/notifications/push";

type NoticeText = string | ((locale: Locale) => string);

async function written(userId: string, title: NoticeText, body: NoticeText) {
    if (typeof title !== "function" && typeof body !== "function") return { title, body };
    const locale = await savedLocale(userId);
    return {
        title: typeof title === "function" ? title(locale) : title,
        body: typeof body === "function" ? body(locale) : body,
    };
}

// dedupeKey is unique, so running the same booking or cron pass twice does not insert a second row.
export async function notify(userId: string, title: NoticeText, body: NoticeText, dedupeKey: string, href = "/dashboard") {
    const text = await written(userId, title, body);
    try {
        await prisma.notification.create({ data: { userId, title: text.title, body: text.body, dedupeKey } });
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return;
        throw error;
    }
    try {
        const locale = await savedLocale(userId);
        const shown = presentNotice(text, messages(locale), locale);
        await deliverPush(userId, shown.title, shown.body, href);
    } catch {
        // The in-app notice is already saved. A failed browser push must not undo it.
    }
}

export async function notifyStaff(title: NoticeText, body: NoticeText, key: string, href = "/dashboard") {
    const staff = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SECONDARY_ADMIN"] } },
        select: { id: true },
    });
    for (const person of staff) {
        await notify(person.id, title, body, `${key}:${person.id}`, href);
    }
}

export async function notifyOwnerAndStaff(
    ownerId: string,
    title: NoticeText,
    body: NoticeText,
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
