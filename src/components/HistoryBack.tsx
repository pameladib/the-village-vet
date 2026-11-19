"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export default function HistoryBack({ fallback, className, children }: { fallback: string; className?: string; children: ReactNode }) {
    const router = useRouter();

    function goBack() {
        if (window.history.length > 1) {
            router.back();
            return;
        }
        router.push(fallback);
    }

    return (
        <button type="button" onClick={goBack} className={className}>
            {children}
        </button>
    );
}
