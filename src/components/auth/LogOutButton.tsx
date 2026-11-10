"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
