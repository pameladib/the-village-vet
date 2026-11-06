"use client";

import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/actions/locale";
import type { Locale } from "@/lib/i18n";

export default function LocaleSwitch({ locale, label }: { locale: Locale; label: string }) {
    const router = useRouter();

    return (
        <button
            type="button"
            onClick={async () => {
                await setLocale(locale === "ar" ? "en" : "ar");
                router.refresh();
            }}
            className="rounded-full border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-100"
        >
            {label}
        </button>
    );
}
