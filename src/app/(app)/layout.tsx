import { headers } from "next/headers";
import SiteHeader from "@/components/SiteHeader";
import { auth } from "@/lib/auth/auth";
import { enforcePasswordChange } from "@/lib/auth/password-change";
import { getLocale, messages } from "@/lib/i18n";
import { rememberLocale } from "@/lib/locale-preference";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const copy = messages(locale);
    const session = await auth.api.getSession({ headers: await headers() });
    await enforcePasswordChange(session?.user.role, session?.user.id);
    await rememberLocale(session?.user.id, locale);
    const staff = session && (session.user.role === "ADMIN" || session.user.role === "SECONDARY_ADMIN") ? session : null;
    const notices = staff
        ? await prisma.notification.findMany({
            where: { userId: staff.user.id, readAt: null },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { id: true, title: true, body: true, readAt: true, createdAt: true, dedupeKey: true },
        })
        : undefined;

    return (
        <div className="flex min-h-full flex-1 flex-col bg-[#F8FAF9] dark:bg-stone-950">
            <SiteHeader copy={copy} locale={locale} showProfile={session?.user.role === "OWNER"} showEmergency={session?.user.role === "OWNER"} notices={notices} />
            {children}
        </div>
    );
}
