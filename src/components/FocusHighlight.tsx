"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function FocusHighlight({ id, active, clearHref }: { id: string; active: boolean; clearHref: string }) {
    const router = useRouter();

    useEffect(() => {
        if (!active) return;
        const nodes = [...document.querySelectorAll(`[data-focus="${id}"]`)];
        const visible = nodes.find((node) => node instanceof HTMLElement && node.offsetParent !== null) ?? nodes[0];
        visible?.scrollIntoView({ block: "center" });
        const timer = window.setTimeout(() => {
            router.replace(clearHref, { scroll: false });
        }, 5000);
        return () => window.clearTimeout(timer);
    }, [active, clearHref, id, router]);

    return null;
}
