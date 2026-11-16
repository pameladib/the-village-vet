"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Copy } from "@/lib/i18n";

type InstallEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const dismissedKey = "village-vet-install-dismissed";

function installed() {
    const nav = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function remembered() {
    try {
        return localStorage.getItem(dismissedKey) === "1";
    } catch {
        return false;
    }
}

function remember() {
    try {
        localStorage.setItem(dismissedKey, "1");
    } catch {
        // A private browser can refuse storage. The prompt stays hidden for this visit.
    }
}

export default function InstallPrompt({ copy }: { copy: Copy }) {
    const [prompt, setPrompt] = useState<InstallEvent | null>(null);
    const [ios, setIos] = useState(false);

    useEffect(() => {
        if (installed() || remembered()) return;
        function onPrompt(event: Event) {
            event.preventDefault();
            setPrompt(event as InstallEvent);
            setIos(false);
        }
        function hide() {
            setPrompt(null);
            setIos(false);
        }
        window.addEventListener("beforeinstallprompt", onPrompt);
        window.addEventListener("appinstalled", hide);
        const appleMobile = /iPad|iPhone|iPod/.test(window.navigator.userAgent)
            || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        if (appleMobile) setIos(true);
        return () => {
            window.removeEventListener("beforeinstallprompt", onPrompt);
            window.removeEventListener("appinstalled", hide);
        };
    }, []);

    if (!prompt && !ios) return null;

    function dismiss() {
        remember();
        setPrompt(null);
        setIos(false);
    }

    return (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-stone-700 dark:bg-stone-900">
            <p className="text-stone-700 dark:text-stone-200">{prompt ? copy.installPrompt : copy.installIos}</p>
            <div className="flex shrink-0 items-center gap-2">
                {prompt ? (
                    <button
                        type="button"
                        onClick={async () => {
                            await prompt.prompt();
                            const choice = await prompt.userChoice;
                            if (choice.outcome === "dismissed") remember();
                            setPrompt(null);
                        }}
                        className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950"
                    >
                        {copy.installNow}
                    </button>
                ) : (
                    <Link href="/install" className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950">
                        {copy.installLink}
                    </Link>
                )}
                <button type="button" onClick={dismiss} className="rounded-full px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800">
                    {copy.installLater}
                </button>
            </div>
        </div>
    );
}
