"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function PatientSearch({
    query,
    tab = "active",
    path = "/admin/patients",
    label,
    placeholder,
    children,
}: {
    query: string;
    tab?: "active" | "archived" | "deceased";
    path?: string;
    label: string;
    placeholder: string;
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [value, setValue] = useState(query);
    const [pending, startTransition] = useTransition();
    const requested = useRef(query);

    useEffect(() => {
        if (query === requested.current) return;
        requested.current = query;
        setValue(query);
    }, [query]);

    useEffect(() => {
        const next = value.trim();
        if (next === query) return;
        const delay = next ? 200 : 0;
        const timer = window.setTimeout(() => {
            requested.current = next;
            const params = new URLSearchParams();
            if (path === "/admin/patients" && tab !== "active") params.set("tab", tab);
            if (next) params.set("q", next);
            const search = params.toString();
            startTransition(() => {
                router.replace(search ? `${path}?${search}` : path, { scroll: false });
            });
        }, delay);
        return () => window.clearTimeout(timer);
    }, [value, query, tab, path, router]);

    return (
        <>
            <label className="mt-5 block">
                <span className="sr-only">{label}</span>
                <input
                    type="search"
                    value={value}
                    autoComplete="off"
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                />
            </label>
            <div className={pending ? "opacity-60 transition-opacity" : "transition-opacity"}>{children}</div>
        </>
    );
}
