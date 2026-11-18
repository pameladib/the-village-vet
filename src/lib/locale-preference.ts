import type { Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export async function rememberLocale(userId: string | undefined, locale: Locale) {
    if (!userId) return;
    await prisma.user.updateMany({
        where: { id: userId, NOT: { locale } },
        data: { locale },
    });
}

export async function savedLocale(userId: string): Promise<Locale> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { locale: true } });
    return user?.locale === "ar" ? "ar" : "en";
}
