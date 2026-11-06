import Link from "next/link";
import LocaleSwitch from "@/components/LocaleSwitch";
import type { Copy, Locale } from "@/lib/i18n";

export default function SiteHeader({ copy, locale }: { copy: Copy; locale: Locale }) {
    return (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-white px-4 py-3 dark:border-emerald-950 dark:bg-stone-950">
            <Link href="/" className="text-sm font-semibold tracking-wide text-emerald-900 dark:text-emerald-100">
                {copy.clinicName}
            </Link>
            <nav className="flex flex-wrap items-center gap-3 text-sm text-emerald-900 dark:text-emerald-100">
                <Link href="/clinic">{copy.clinic}</Link>
                <Link href="/shop">{copy.shop}</Link>
                <Link href="/dashboard">{copy.dashboard}</Link>
                <LocaleSwitch locale={locale} label={copy.language} />
            </nav>
        </header>
    );
}
