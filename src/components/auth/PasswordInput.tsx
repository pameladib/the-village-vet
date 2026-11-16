"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({
    showLabel,
    hideLabel,
    className = "",
    wrapperClassName = "",
    ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
    showLabel: string;
    hideLabel: string;
    wrapperClassName?: string;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div className={`relative ${wrapperClassName}`}>
            <input
                {...props}
                type={visible ? "text" : "password"}
                spellCheck={false}
                className={`${className} pe-10`}
                style={{ paddingInlineEnd: "2.5rem", ...props.style }}
            />
            <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                aria-label={visible ? hideLabel : showLabel}
                aria-pressed={visible}
                className="absolute end-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            >
                {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
        </div>
    );
}
