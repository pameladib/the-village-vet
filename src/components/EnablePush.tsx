"use client";

import { useEffect, useState } from "react";
import { savePushSubscription } from "@/lib/actions/push";
import type { Copy } from "@/lib/i18n";

function keyBytes(value: string) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export default function EnablePush({ copy }: { copy: Copy }) {
    const [status, setStatus] = useState<"hidden" | "offer" | "on" | "denied">("hidden");

    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
        const publicKey = document.querySelector('meta[name="village-vet-vapid"]')?.getAttribute("content") ?? "";
        if (!publicKey) return;
        let cancelled = false;

        navigator.serviceWorker.ready.then(async (registration) => {
            if (cancelled) return;
            if (Notification.permission === "denied") {
                setStatus("denied");
                return;
            }
            const existing = await registration.pushManager.getSubscription();
            if (cancelled) return;
            setStatus(existing ? "on" : "offer");
        }).catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, []);

    async function enable() {
        const publicKey = document.querySelector('meta[name="village-vet-vapid"]')?.getAttribute("content") ?? "";
        if (!publicKey) return;
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            setStatus(permission === "denied" ? "denied" : "offer");
            return;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes(publicKey),
        });
        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return;
        const saved = await savePushSubscription({
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
        });
        setStatus(saved.success ? "on" : "offer");
    }

    if (status === "hidden") return null;
    if (status === "on") return <p className="mt-3 text-sm text-stone-500">{copy.pushEnabled}</p>;
    if (status === "denied") return <p className="mt-3 text-sm text-stone-500">{copy.pushDenied}</p>;

    return (
        <button
            type="button"
            onClick={enable}
            className="mt-3 rounded-full border border-emerald-800 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50 dark:border-emerald-300 dark:text-emerald-100 dark:hover:bg-emerald-950"
        >
            {copy.pushEnable}
        </button>
    );
}
