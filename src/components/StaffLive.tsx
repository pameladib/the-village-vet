"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { markNotificationRead } from "@/lib/actions/notifications";
import { armChime, playChime } from "@/lib/notice-chime";

type Arrival = { id: string; title: string; body: string; href: string | null };

function fieldFocused() {
    const current = document.activeElement;
    if (!(current instanceof HTMLElement)) return false;
    const tag = current.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || current.isContentEditable;
}

export default function StaffLive() {
    const router = useRouter();
    const revision = useRef<string | null>(null);
    const heard = useRef(0);
    const primed = useRef(false);
    const seen = useRef(new Set<string>());
    const queue = useRef<Arrival[]>([]);
    const [current, setCurrent] = useState<Arrival | null>(null);

    useEffect(() => {
        const arm = () => armChime();
        window.addEventListener("pointerdown", arm);
        window.addEventListener("keydown", arm);
        return () => {
            window.removeEventListener("pointerdown", arm);
            window.removeEventListener("keydown", arm);
        };
    }, []);

    useEffect(() => {
        if (!current) return;
        const timer = window.setTimeout(() => setCurrent(queue.current.shift() ?? null), 5000);
        return () => window.clearTimeout(timer);
    }, [current]);

    function enqueue(items: Arrival[]) {
        if (items.length === 0) return;
        queue.current.push(...items);
        setCurrent((shown) => shown ?? queue.current.shift() ?? null);
    }

    function openCurrent() {
        const notice = current;
        if (!notice) return;
        setCurrent(queue.current.shift() ?? null);
        if (notice.href) {
            void markNotificationRead(notice.id);
            router.push(notice.href);
        }
    }

    useEffect(() => {
        let timer = 0;
        let stopped = false;
        let looking = false;

        async function look() {
            if (stopped || looking || document.visibilityState !== "visible") return;
            looking = true;
            try {
                const response = await fetch("/api/staff/pulse", { cache: "no-store" });
                if (!response.ok) return;
                const data = await response.json() as { revision?: unknown; unread?: unknown; notices?: unknown };
                if (typeof data.revision !== "string" || typeof data.unread !== "number" || !Array.isArray(data.notices)) return;
                const notices = data.notices.flatMap((notice) => {
                    if (!notice || typeof notice !== "object") return [];
                    const row = notice as { id?: unknown; title?: unknown; body?: unknown; href?: unknown };
                    if (typeof row.id !== "string" || typeof row.title !== "string" || typeof row.body !== "string") return [];
                    return [{ id: row.id, title: row.title, body: row.body, href: typeof row.href === "string" ? row.href : null }];
                });
                if (!primed.current) {
                    primed.current = true;
                    revision.current = data.revision;
                    heard.current = data.unread;
                    for (const notice of notices) seen.current.add(notice.id);
                    return;
                }
                const fresh = notices.filter((notice) => !seen.current.has(notice.id));
                for (const notice of fresh) seen.current.add(notice.id);
                const changed = data.revision !== revision.current;
                if (fresh.length > 0) {
                    playChime();
                    enqueue(fresh);
                }
                heard.current = data.unread;
                window.dispatchEvent(new CustomEvent("village-vet-unread", { detail: data.unread }));
                if (!changed || fieldFocused()) return;
                revision.current = data.revision;
                router.refresh();
            } catch {
                // The next check tries again.
            } finally {
                looking = false;
            }
        }

        function onMessage(event: MessageEvent) {
            if (event.origin && event.origin !== window.location.origin) return;
            if (!event.data || event.data.type !== "village-vet-notice") return;
            void look();
        }

        function onVisible() {
            if (document.visibilityState === "visible") void look();
        }

        timer = window.setInterval(() => { void look(); }, 15000);
        void look();
        document.addEventListener("visibilitychange", onVisible);
        navigator.serviceWorker?.addEventListener("message", onMessage);
        return () => {
            stopped = true;
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
            navigator.serviceWorker?.removeEventListener("message", onMessage);
        };
    }, [router]);

    if (!current) return null;

    return (
        <button
            type="button"
            onClick={openCurrent}
            className="fixed top-4 right-4 z-50 flex w-[min(20rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-start shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
            <Bell className="mt-0.5 size-4 shrink-0 text-emerald-800 dark:text-emerald-200" strokeWidth={1.75} />
            <span className="min-w-0">
                <span className="block text-sm font-medium text-emerald-950 dark:text-emerald-50">{current.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-stone-600 dark:text-stone-300">{current.body}</span>
            </span>
        </button>
    );
}
