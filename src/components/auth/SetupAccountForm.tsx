"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import PasswordInput from "@/components/auth/PasswordInput";
import { consumeOwnerInvite } from "@/lib/actions/invite";
import type { Copy } from "@/lib/i18n";

export default function SetupAccountForm({ token, name, phoneNumber, copy }: { token: string; name: string; phoneNumber: string; copy: Copy }) {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    return (
        <form
            className="mt-6 flex max-w-md flex-col gap-3"
            onSubmit={async (event) => {
                event.preventDefault();
                setPending(true);
                setError(null);
                const normalized = username.trim().toLowerCase();
                const { error: signUpError } = await authClient.signUp.email({
                    name,
                    username: normalized,
                    phoneNumber,
                    password,
                    email: `${normalized}@clients.thevillagevet.local`,
                });
                if (signUpError) {
                    setPending(false);
                    setError(copy.setupFail);
                    return;
                }
                const consumed = await consumeOwnerInvite(token, phoneNumber);
                setPending(false);
                if (!consumed.success) {
                    setError(copy.setupMismatch);
                    return;
                }
                router.push("/pets/new");
            }}
        >
            <p className="text-sm text-stone-700 dark:text-stone-200">{name} · {phoneNumber}</p>
            <input value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} placeholder={copy.username} className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
            <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} placeholder={copy.password} showLabel={copy.showPassword} hideLabel={copy.hidePassword} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={pending} className="w-fit rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
                {pending ? copy.setupCreating : copy.setupCreate}
            </button>
        </form>
    );
}
