"use client";

import { useEffect, useState } from "react";
import type { Copy } from "@/lib/i18n";

function fieldIsFocused() {
    const el = document.activeElement;
    return el instanceof HTMLElement && (el.isContentEditable || el.matches("input, textarea, select"));
}

export default function PwaProvider({ copy, signedIn }: { copy: Copy; signedIn: boolean }) {
    const [updateReady, setUpdateReady] = useState(false);

    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;
        let reloadOnNextChange = false;
        let hadController = Boolean(navigator.serviceWorker.controller);
        let registration: ServiceWorkerRegistration | null = null;
        let waitingWorker: ServiceWorker | null = null;
        let applying = false;

        function activate(worker: ServiceWorker) {
            waitingWorker = worker;
            if (signedIn) {
                setUpdateReady(true);
                return;
            }
            if (fieldIsFocused() || applying) return;
            applying = true;
            reloadOnNextChange = true;
            worker.postMessage({ type: "SKIP_WAITING" });
        }

        function onControllerChange() {
            if (reloadOnNextChange) {
                window.location.reload();
                return;
            }
            if (hadController && signedIn) setUpdateReady(true);
            hadController = true;
        }

        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

        navigator.serviceWorker.register("/sw.js").then((next) => {
            registration = next;
            if (next.waiting && navigator.serviceWorker.controller) activate(next.waiting);
            next.addEventListener("updatefound", () => {
                const worker = next.installing;
                if (!worker) return;
                worker.addEventListener("statechange", () => {
                    if (worker.state === "installed" && navigator.serviceWorker.controller) activate(worker);
                });
            });
        }).catch(() => undefined);

        function onVisible() {
            if (document.visibilityState === "visible") registration?.update().catch(() => undefined);
        }
        function resumeQuietUpdate(event: FocusEvent) {
            const next = event.relatedTarget;
            if (next instanceof HTMLElement && (next.isContentEditable || next.matches("input, textarea, select"))) return;
            if (!signedIn && waitingWorker) activate(waitingWorker);
        }
        document.addEventListener("visibilitychange", onVisible);
        document.addEventListener("focusout", resumeQuietUpdate);

        const update = () => {
            const waiting = waitingWorker ?? registration?.waiting;
            if (!waiting) return;
            reloadOnNextChange = true;
            waiting.postMessage({ type: "SKIP_WAITING" });
        };
        window.addEventListener("village-vet-update", update);

        return () => {
            navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
            document.removeEventListener("visibilitychange", onVisible);
            document.removeEventListener("focusout", resumeQuietUpdate);
            window.removeEventListener("village-vet-update", update);
        };
    }, [signedIn]);

    if (!signedIn || !updateReady) return null;

    return (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-lg dark:border-stone-700 dark:bg-stone-900">
            <p className="text-stone-700 dark:text-stone-200">{copy.updateReady}</p>
            <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("village-vet-update"))}
                className="shrink-0 rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950"
            >
                {copy.updateNow}
            </button>
        </div>
    );
}
