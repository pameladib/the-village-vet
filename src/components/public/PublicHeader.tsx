"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import ClinicLogo from "@/components/ClinicLogo";
import LogOutButton from "@/components/auth/LogOutButton";
import CurrencySwitch from "@/components/CurrencySwitch";
import LocaleSwitch from "@/components/LocaleSwitch";
import type { Copy, Locale } from "@/lib/i18n";
import type { Currency } from "@/lib/shop/money";

const visitorLinks = [
    { href: "/", key: "home" },
    { href: "/about", key: "navAbout" },
    { href: "/shop", key: "navStore" },
    { href: "/find-us", key: "navFindUs" },
    { href: "/emergency", key: "emergency" },
] as const;

const customerLinks = [
    { href: "/", key: "clinic" },
    { href: "/emergency", key: "emergency" },
    { href: "/shop", key: "shop" },
    { href: "/dashboard", key: "dashboard" },
    { href: "/profile", key: "profile" },
] as const;

const menuItem = "flex min-h-11 items-center rounded-md px-3 text-base";

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
    const headerRef = useRef<HTMLElement>(null);
    const showCurrency = pathname === "/shop" || pathname.startsWith("/shop/");
    const customer = loggedIn && showProfile;
    const accountHref = loggedIn ? "/dashboard" : "/login";
    const accountLabel = loggedIn ? copy.dashboard : copy.logIn;
    const mobileLinks = customer ? customerLinks : visitorLinks;

    function current(href: string) {
        if (href === "/") return pathname === "/";
        return pathname === href || pathname.startsWith(`${href}/`);
    }

    function close() {
        setOpen(false);
    }

    useEffect(() => {
        if (!open) return;
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false);
        }
        function onPointer(event: PointerEvent) {
            if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener("keydown", onKey);
        document.addEventListener("pointerdown", onPointer);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("pointerdown", onPointer);
        };
    }, [open]);

    return (
        <header ref={headerRef} className="sticky top-0 z-20 border-b border-stone-200/80 bg-white">
            <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-4 px-5 py-2 sm:gap-6">
                <Link href="/" className="shrink-0 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40">
                    <ClinicLogo locale={locale} name={copy.clinicName} className={locale === "ar" ? "h-10 w-auto sm:h-11" : "h-12 w-auto max-w-[9.5rem] sm:h-14 sm:max-w-none"} />
                </Link>
                <nav className="ms-auto hidden items-center gap-1 lg:flex" aria-label={copy.menu}>
                    {visitorLinks.map((link) => {
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
                    {showCurrency && (
                        <div className="hidden lg:block">
                            <CurrencySwitch currency={currency} label={copy.currency} />
                        </div>
                    )}
                    <div className="hidden lg:block">
                        <LocaleSwitch locale={locale} label={copy.language} className="rounded-full border border-stone-200 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-50" />
                    </div>
                    {showProfile && (
                        <Link href="/profile" className="hidden text-sm font-semibold text-emerald-950 hover:text-emerald-800 lg:inline">
                            {copy.profile}
                        </Link>
                    )}
                    <Link href={accountHref} className="hidden text-sm font-semibold text-emerald-950 hover:text-emerald-800 lg:inline">
                        {accountLabel}
                    </Link>
                    {loggedIn && (
                        <LogOutButton label={copy.logOut} className="hidden text-sm font-semibold text-emerald-950 hover:text-emerald-800 disabled:opacity-60 lg:inline" />
                    )}
                    <button
                        type="button"
                        aria-expanded={open}
                        aria-controls="public-menu"
                        aria-label={open ? copy.closeMenu : copy.menu}
                        onClick={() => setOpen((value) => !value)}
                        className="inline-flex size-11 items-center justify-center rounded-md text-emerald-950 hover:bg-emerald-50 lg:hidden"
                    >
                        {open ? <X className="size-6" strokeWidth={1.75} /> : <Menu className="size-6" strokeWidth={1.75} />}
                    </button>
                </div>
            </div>
            {open && (
                <nav id="public-menu" aria-label={copy.menu} className="flex flex-col overflow-x-clip border-t border-stone-200 px-3 py-2 lg:hidden">
                    {showCurrency && (
                        <div className="flex min-h-11 items-center px-3">
                            <CurrencySwitch currency={currency} label={copy.currency} />
                        </div>
                    )}
                    {mobileLinks.map((link) => {
                        const active = current(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={active ? "page" : undefined}
                                onClick={close}
                                className={`${menuItem} ${active ? "bg-emerald-50 font-semibold text-emerald-950" : "text-stone-700 hover:bg-emerald-50 hover:text-emerald-950"}`}
                            >
                                {copy[link.key]}
                            </Link>
                        );
                    })}
                    {!customer && (
                        <Link
                            href={accountHref}
                            aria-current={current(accountHref) ? "page" : undefined}
                            onClick={close}
                            className={`${menuItem} font-semibold text-emerald-950 hover:bg-emerald-50`}
                        >
                            {accountLabel}
                        </Link>
                    )}
                    {loggedIn && (
                        <div onClick={close}>
                            <LogOutButton label={copy.logOut} className={`${menuItem} w-full text-start font-semibold text-emerald-950 hover:bg-emerald-50 disabled:opacity-60`} />
                        </div>
                    )}
                    <div className="mt-1 border-t border-stone-200 px-3 py-3">
                        <LocaleSwitch locale={locale} label={copy.language} className="inline-flex min-h-11 items-center rounded-full border border-stone-200 px-4 text-sm font-medium text-emerald-950 hover:bg-emerald-50" />
                    </div>
                </nav>
            )}
        </header>
    );
}
