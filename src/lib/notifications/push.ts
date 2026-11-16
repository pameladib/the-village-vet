import { sendNotification, setVapidDetails } from "web-push";
import { prisma } from "@/lib/prisma";

function safeHref(href: string) {
    if (!href.startsWith("/") || href.startsWith("//") || href.includes("://") || href.includes("\\")) return "/dashboard";
    return href;
}

export async function deliverPush(userId: string, title: string, body: string, href: string) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return;

    setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:clinic@thevillagevet.local", publicKey, privateKey);
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    const payload = JSON.stringify({ title, body, href: safeHref(href) });

    await Promise.all(subscriptions.map(async (subscription) => {
        try {
            await sendNotification(
                { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
                payload,
            );
        } catch (error) {
            const status = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : 0;
            if (status === 404 || status === 410) {
                await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
            }
        }
    }));
}
