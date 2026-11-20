import { getLocale, messages } from "@/lib/i18n";
import { requireRole } from "@/lib/auth/session";
import { noticeHref } from "@/lib/notifications/href";
import { presentNotice } from "@/lib/notifications/present";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// A small stamp the open staff screens compare, so they reload only after something changed.
export async function GET() {
    try {
        const session = await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
        const locale = await getLocale();
        const copy = messages(locale);
        const [appointment, order, unread, newest, notices] = await Promise.all([
            prisma.appointment.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
            prisma.shopOrder.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
            prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
            prisma.notification.findFirst({
                where: { userId: session.user.id, readAt: null },
                orderBy: { createdAt: "desc" },
                select: { id: true },
            }),
            prisma.notification.findMany({
                where: { userId: session.user.id, readAt: null },
                orderBy: { createdAt: "desc" },
                take: 5,
                select: { id: true, title: true, body: true, dedupeKey: true },
            }),
        ]);
        const revision = [appointment?.updatedAt.toISOString() ?? "", order?.updatedAt.toISOString() ?? "", newest?.id ?? "", String(unread)].join("|");
        return Response.json({
            revision,
            unread,
            notices: notices.map((notice) => {
                const text = presentNotice(notice, copy, locale);
                return { id: notice.id, title: text.title, body: text.body, href: noticeHref(notice.dedupeKey, "staff") };
            }),
        }, { headers: { "Cache-Control": "no-store" } });
    } catch {
        return Response.json({ error: "unauthorized" }, { status: 401 });
    }
}
