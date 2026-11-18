"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    CalendarDays,
    CalendarOff,
    HeartPulse,
    Image as ImageIcon,
    LayoutDashboard,
    Package,
    PawPrint,
    Settings,
    ShoppingBag,
    UserPlus,
    Warehouse,
} from "lucide-react";
import type { Copy } from "@/lib/i18n";

type Item = {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
};

export default function StaffNav({
    copy,
    clinical,
    manageClinic,
}: {
    copy: Copy;
    clinical: boolean;
    manageClinic: boolean;
}) {
    const pathname = usePathname();
    const groups: { label: string; items: Item[] }[] = [
        {
            label: copy.navGroupClinic,
            items: [
                { href: "/dashboard", label: copy.dashboard, icon: LayoutDashboard, exact: true },
                { href: "/admin/appointments", label: copy.appointments, icon: CalendarDays },
                { href: "/admin/patients", label: copy.patients, icon: PawPrint },
                ...(clinical ? [{ href: "/admin/care", label: copy.careManagement, icon: HeartPulse }] : []),
            ],
        },
        {
            label: copy.navGroupShop,
            items: [
                { href: "/admin/orders", label: copy.orders, icon: ShoppingBag },
                { href: "/admin/shop", label: copy.products, icon: Package },
                { href: "/admin/inventory", label: copy.inventory, icon: Warehouse },
            ],
        },
        {
            label: copy.navGroupSettings,
            items: [
                ...(manageClinic
                    ? [
                        { href: "/admin/homepage", label: copy.homepageContent, icon: ImageIcon },
                        { href: "/admin/settings", label: copy.settings, icon: Settings },
                        { href: "/admin/blocks", label: copy.blocks, icon: CalendarOff },
                    ]
                    : []),
                { href: "/admin/invites", label: copy.invites, icon: UserPlus },
            ],
        },
    ];

    return (
        <aside className="border-b border-stone-200 bg-white md:sticky md:top-0 md:h-[calc(100dvh-4.25rem)] md:w-56 md:shrink-0 md:overflow-y-auto md:border-e md:border-b-0 dark:border-stone-800 dark:bg-stone-900">
            <nav className="flex gap-4 overflow-x-auto px-3 py-2 md:flex-col md:gap-0 md:overflow-visible md:px-3 md:py-4">
                {groups.map((group) => (
                    <div key={group.label} className="group flex shrink-0 gap-1 md:flex-col">
                        <p className="hidden px-3 pt-4 pb-1 text-[0.68rem] font-semibold tracking-wide text-stone-400 group-first:pt-0 md:block">{group.label}</p>
                        {group.items.map((item) => {
                            const Icon = item.icon;
                            const current = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={current ? "page" : undefined}
                                    className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                                        current
                                            ? "bg-emerald-900 text-white"
                                            : "text-stone-700 hover:bg-emerald-50 hover:text-emerald-950 dark:text-stone-200 dark:hover:bg-stone-800 dark:hover:text-emerald-50"
                                    }`}
                                >
                                    <Icon className="size-4 shrink-0" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>
        </aside>
    );
}
