"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { removePushSubscription } from "@/lib/actions/push";
import { authClient } from "@/lib/auth/auth-client";

export default function LogOutButton({ label, className }: { label: string; className?: string }) {
    const router = useRouter();
    const [pending, setPending] = useState(false);

    return (
        <button
            type="button"
            disabled={pending}
            onClick={async () => {
                setPending(true);
                try {
                    const registration = await navigator.serviceWorker?.getRegistration();
                    const subscription = await registration?.pushManager?.getSubscription();
                    if (subscription) {
                        await removePushSubscription(subscription.endpoint);
                        await subscription.unsubscribe();
                    }
                } catch {
                    // Signing out still continues when this browser has no push subscription.
                }
                const { error } = await authClient.signOut();
                if (error) {
                    setPending(false);
                    return;
                }
                router.push("/");
                router.refresh();
            }}
            className={className}
        >
            {label}
        </button>
    );
}
