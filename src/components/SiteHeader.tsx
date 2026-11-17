import Link from "next/link";
import LogOutButton from "@/components/auth/LogOutButton";
import LocaleSwitch from "@/components/LocaleSwitch";
import NotificationBell from "@/components/NotificationBell";
import type { Copy, Locale } from "@/lib/i18n";

export default function SiteHeader({
    copy,
    locale,
    showProfile = false,
    notices,
}: {
    copy: Copy;
    locale: Locale;
    showProfile?: boolean;
    notices?: { id: string; title: string; body: string; readAt: Date | null; createdAt?: Date | null; dedupeKey?: string | null }[];
}) {
    return (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-white px-4 py-3 dark:border-emerald-950 dark:bg-stone-950">
            <Link href="/" className="text-sm font-semibold tracking-wide text-emerald-900 dark:text-emerald-100">
                {copy.clinicName}
            </Link>
            <nav className="flex flex-wrap items-center gap-3 text-sm text-emerald-900 dark:text-emerald-100">
                <Link href="/">{copy.clinic}</Link>
                <Link href="/shop">{copy.shop}</Link>
                <Link href="/dashboard">{copy.dashboard}</Link>
                {notices !== undefined && <NotificationBell copy={copy} locale={locale} items={notices} />}
                {showProfile && (
                    <Link href="/profile">{copy.profile}</Link>
                )}
                <LogOutButton label={copy.logOut} className="hover:text-emerald-700 disabled:opacity-60 dark:hover:text-emerald-300" />
                <LocaleSwitch locale={locale} label={copy.language} />
            </nav>
        </header>
    );
}
