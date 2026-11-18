"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LogOutButton from "@/components/auth/LogOutButton";
import CurrencySwitch from "@/components/CurrencySwitch";
import LocaleSwitch from "@/components/LocaleSwitch";
import type { Copy, Locale } from "@/lib/i18n";
import type { Currency } from "@/lib/shop/money";

const links = [
    { href: "/", key: "home" },
    { href: "/about", key: "navAbout" },
    { href: "/shop", key: "navStore" },
    { href: "/find-us", key: "navFindUs" },
    { href: "/emergency", key: "emergency" },
] as const;

export default function PublicHeader({
    copy,
    locale,
    currency,
    loggedIn,
    showProfile = false,
}: {
    copy: Copy;
    locale: Locale;
    currency: Currency;
    loggedIn: boolean;
    showProfile?: boolean;
}) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const accountHref = loggedIn ? "/dashboard" : "/login";
    const accountLabel = loggedIn ? copy.dashboard : copy.logIn;

    function current(href: string) {
        if (href === "/") return pathname === "/";
        return pathname === href || pathname.startsWith(`${href}/`);
    }

    return (
        <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-white">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-5">
                <Link href="/" className="shrink-0 text-[0.95rem] font-semibold tracking-wide text-emerald-950">
                    {copy.clinicName}
                </Link>
                <nav className="ms-auto hidden items-center gap-1 lg:flex" aria-label={copy.menu}>
                    {links.map((link) => {
                        const active = current(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={active ? "page" : undefined}
                                className={`px-3 py-2 text-sm ${active ? "font-semibold text-emerald-950 underline decoration-emerald-800 decoration-2 underline-offset-8" : "text-stone-600 hover:text-emerald-950"}`}
                            >
                                {copy[link.key]}
                            </Link>
                        );
                    })}
                </nav>
                <div className="ms-auto flex items-center gap-3 lg:ms-2">
                    <CurrencySwitch currency={currency} label={copy.currency} />
                    <LocaleSwitch locale={locale} label={copy.language} className="rounded-full border border-stone-200 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-50" />
                    {showProfile && (
                        <Link href="/profile" className="text-sm font-semibold text-emerald-950 hover:text-emerald-800">
                            {copy.profile}
                        </Link>
                    )}
                    <Link href={accountHref} className="hidden text-sm font-semibold text-emerald-950 hover:text-emerald-800 sm:inline">
                        {accountLabel}
                    </Link>
                    {loggedIn && (
                        <LogOutButton label={copy.logOut} className="hidden text-sm font-semibold text-emerald-950 hover:text-emerald-800 disabled:opacity-60 sm:inline" />
                    )}
                    <button
                        type="button"
                        aria-expanded={open}
                        aria-controls="public-menu"
                        onClick={() => setOpen((value) => !value)}
                        className="text-sm font-medium text-emerald-950 lg:hidden"
                    >
                        {open ? copy.closeMenu : copy.menu}
                    </button>
                </div>
            </div>
            {open && (
                <nav id="public-menu" className="flex flex-col gap-1 border-t border-stone-200 px-5 py-3 lg:hidden">
                    <div className="px-2 py-2">
                        <CurrencySwitch currency={currency} label={copy.currency} />
                    </div>
                    {links.map((link) => {
                        const active = current(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={active ? "page" : undefined}
                                onClick={() => setOpen(false)}
                                className={`rounded-md px-2 py-2 text-sm ${active ? "font-semibold text-emerald-950" : "text-stone-700"}`}
                            >
                                {copy[link.key]}
                            </Link>
                        );
                    })}
                    <Link href={accountHref} onClick={() => setOpen(false)} className="px-2 py-2 text-sm font-semibold text-emerald-950">
                        {accountLabel}
                    </Link>
                    {loggedIn && (
                        <LogOutButton label={copy.logOut} className="px-2 py-2 text-start text-sm font-semibold text-emerald-950" />
                    )}
                </nav>
            )}
        </header>
    );
}
