import { sendNotification, setVapidDetails } from "web-push";
import { prisma } from "@/lib/prisma";

const publicSite = "https://the-village-vet.vercel.app";

function safeHref(href: string) {
    if (!href.startsWith("/") || href.startsWith("//") || href.includes("://") || href.includes("\\")) return "/dashboard";
    return href;
}

// Apple rejects a VAPID contact on localhost or a .local host with BadJwtToken and does not deliver the push.
function subjectHost(subject: string) {
    try {
        const url = new URL(subject);
        if (url.protocol === "mailto:") {
            const address = subject.slice("mailto:".length).split("?")[0] ?? "";
            const at = address.lastIndexOf("@");
            return at >= 0 ? address.slice(at + 1).toLowerCase() : "";
        }
        if (url.protocol === "https:") return url.hostname.toLowerCase();
    } catch {
        return "";
    }
    return "";
}

function appleAcceptsSubject(subject: string) {
    const host = subjectHost(subject);
    return Boolean(host) && host !== "localhost" && !host.endsWith(".localhost") && !host.endsWith(".local");
}

function pushSubject() {
    const configured = process.env.VAPID_SUBJECT?.trim() ?? "";
    if (appleAcceptsSubject(configured)) return configured;
    const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().toLowerCase();
    if (productionHost && appleAcceptsSubject(`https://${productionHost}`)) return `https://${productionHost}`;
    return publicSite;
}

function failureReason(error: unknown) {
    if (typeof error !== "object" || error === null || !("body" in error) || typeof error.body !== "string") return "";
    try {
        const parsed = JSON.parse(error.body) as { reason?: unknown };
        if (typeof parsed.reason === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(parsed.reason)) return parsed.reason;
    } catch {
        return "";
    }
    return "";
}

export async function deliverPush(userId: string, title: string, body: string, href: string) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
        console.error("Push delivery skipped because the server push keys are not set.");
        return;
    }

    const configured = process.env.VAPID_SUBJECT?.trim() ?? "";
    const subject = pushSubject();
    if (configured && subject !== configured) {
        console.error("Push contact address was rejected for Apple delivery. Using the public site address.");
    }
    setVapidDetails(subject, publicKey, privateKey);
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
            const reason = failureReason(error);
            console.error(`Push delivery failed with status ${status}${reason ? ` (${reason})` : ""}.`);
            if (status === 404 || status === 410) {
                await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
            }
        }
    }));
}
