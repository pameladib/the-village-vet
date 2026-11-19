"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import LogOutButton from "@/components/auth/LogOutButton";
import ClinicLogo from "@/components/ClinicLogo";
import LocaleSwitch from "@/components/LocaleSwitch";
import NotificationBell from "@/components/NotificationBell";
import type { Copy, Locale } from "@/lib/i18n";

const menuItem = "flex min-h-11 w-full items-center rounded-md px-3 text-start text-base";

export default function SiteHeader({
    copy,
    locale,
    showProfile = false,
    showEmergency = false,
    notices,
}: {
    copy: Copy;
    locale: Locale;
    showProfile?: boolean;
    showEmergency?: boolean;
    notices?: { id: string; title: string; body: string; readAt: Date | null; createdAt?: Date | null; dedupeKey?: string | null }[];
}) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const headerRef = useRef<HTMLElement>(null);
    const links = [
        { href: "/", label: copy.clinic },
        ...(showEmergency ? [{ href: "/emergency", label: copy.emergency }] : []),
        { href: "/shop", label: copy.shop },
        { href: "/dashboard", label: copy.dashboard },
        ...(showProfile ? [{ href: "/profile", label: copy.profile }] : []),
    ];

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
        <header ref={headerRef} className="border-b border-emerald-100 bg-white dark:border-emerald-950 dark:bg-stone-950">
            <div className="hidden flex-wrap items-center justify-between gap-3 px-4 py-3 lg:flex">
                <Link href="/" className="text-sm font-semibold tracking-wide text-emerald-900 dark:text-emerald-100">
                    {copy.clinicName}
                </Link>
                <nav className="flex flex-wrap items-center gap-3 text-sm text-emerald-900 dark:text-emerald-100">
                    {links.map((link) => (
                        <Link key={link.href} href={link.href}>{link.label}</Link>
                    ))}
                    {notices !== undefined && <NotificationBell copy={copy} locale={locale} items={notices} />}
                    <LogOutButton label={copy.logOut} className="hover:text-emerald-700 disabled:opacity-60 dark:hover:text-emerald-300" />
                    <LocaleSwitch locale={locale} label={copy.language} />
                </nav>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 lg:hidden">
                <Link href="/" className="shrink-0 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40">
                    <ClinicLogo locale={locale} name={copy.clinicName} className={locale === "ar" ? "h-10 w-auto dark:invert" : "h-12 w-auto max-w-[9.5rem] dark:invert"} />
                </Link>
                <div className="ms-auto flex items-center">
                    {notices !== undefined && <NotificationBell copy={copy} locale={locale} items={notices} />}
                    <button
                        type="button"
                        aria-expanded={open}
                        aria-controls="app-menu"
                        aria-label={open ? copy.closeMenu : copy.menu}
                        onClick={() => setOpen((value) => !value)}
                        className="inline-flex size-11 items-center justify-center rounded-md text-emerald-950 hover:bg-emerald-50 dark:text-emerald-50 dark:hover:bg-emerald-950"
                    >
                        {open ? <X className="size-6" strokeWidth={1.75} /> : <Menu className="size-6" strokeWidth={1.75} />}
                    </button>
                </div>
            </div>
            {open && (
                <nav id="app-menu" aria-label={copy.menu} className="flex flex-col overflow-x-clip border-t border-emerald-100 px-3 py-2 lg:hidden dark:border-emerald-950">
                    {links.map((link) => {
                        const active = current(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={active ? "page" : undefined}
                                onClick={close}
                                className={`${menuItem} ${active ? "bg-emerald-50 font-semibold text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50" : "text-emerald-950 hover:bg-emerald-50 dark:text-emerald-50 dark:hover:bg-emerald-950"}`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                    <div onClick={close}>
                        <LogOutButton label={copy.logOut} className={`${menuItem} font-semibold text-emerald-950 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-50 dark:hover:bg-emerald-950`} />
                    </div>
                    <div className="mt-1 border-t border-emerald-100 px-3 py-3 dark:border-emerald-950">
                        <LocaleSwitch locale={locale} label={copy.language} className="inline-flex min-h-11 items-center rounded-full border border-emerald-200 px-4 text-sm font-medium text-emerald-950 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-50 dark:hover:bg-emerald-950" />
                    </div>
                </nav>
            )}
        </header>
    );
}
