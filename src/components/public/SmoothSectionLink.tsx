"use client";

import type { ReactNode } from "react";

export default function SmoothSectionLink({
    href,
    className,
    children,
}: {
    href: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <a
            href={href}
            className={className}
            onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                const id = href.startsWith("#") ? href.slice(1) : "";
                const target = id ? document.getElementById(id) : null;
                if (!target) return;
                event.preventDefault();
                const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
                history.pushState(null, "", href);
            }}
        >
            {children}
        </a>
    );
}
