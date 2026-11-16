"use client";

import { useEffect, useState } from "react";
import type { Copy } from "@/lib/i18n";

export default function PwaProvider({ copy }: { copy: Copy }) {
    const [updateReady, setUpdateReady] = useState(false);

    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;
        let reloadOnNextChange = false;
        let hadController = Boolean(navigator.serviceWorker.controller);

        function onControllerChange() {
            if (reloadOnNextChange) {
                window.location.reload();
                return;
            }
            if (hadController) setUpdateReady(true);
            hadController = true;
        }

        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

        let registration: ServiceWorkerRegistration | null = null;
        let waitingWorker: ServiceWorker | null = null;
        navigator.serviceWorker.register("/sw.js").then((next) => {
            registration = next;
            if (next.waiting && navigator.serviceWorker.controller) {
                waitingWorker = next.waiting;
                setUpdateReady(true);
            }
            next.addEventListener("updatefound", () => {
                const worker = next.installing;
                if (!worker) return;
                worker.addEventListener("statechange", () => {
                    if (worker.state === "installed" && navigator.serviceWorker.controller) {
                        waitingWorker = worker;
                        setUpdateReady(true);
                    }
                });
            });
        }).catch(() => undefined);

        function onVisible() {
            if (document.visibilityState === "visible") registration?.update().catch(() => undefined);
        }
        document.addEventListener("visibilitychange", onVisible);

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
            window.removeEventListener("village-vet-update", update);
        };
    }, []);

    if (!updateReady) return null;

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
