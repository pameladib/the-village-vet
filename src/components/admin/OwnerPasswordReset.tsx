"use client";

import { useRef, useState } from "react";
import { generateOwnerPassword } from "@/lib/actions/owners";
import type { Copy } from "@/lib/i18n";

export default function OwnerPasswordReset({ copy, userId }: { copy: Copy; userId: string }) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [password, setPassword] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [working, setWorking] = useState(false);

    function close() {
        setPassword(null);
        setError(null);
        setCopied(false);
        dialog.current?.close();
    }

    async function generate() {
        setWorking(true);
        setError(null);
        const result = await generateOwnerPassword(userId);
        setWorking(false);
        if (!result.success) {
            setError(copy.passwordResetFailed);
            return;
        }
        setPassword(result.password);
    }

    return (
        <div className="mt-4">
            <button
                type="button"
                onClick={() => dialog.current?.showModal()}
                className="rounded-full border border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 dark:border-emerald-300 dark:text-emerald-100 dark:hover:bg-emerald-950"
            >
                {copy.generatePassword}
            </button>
            <dialog ref={dialog} className="m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 text-stone-900 shadow-lg backdrop:bg-stone-950/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50" onClose={close}>
                <h3 className="text-base font-semibold text-emerald-950 dark:text-emerald-50">{copy.passwordResetTitle}</h3>
                {!password ? (
                    <>
                        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{copy.passwordResetExplain}</p>
                        {error && <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button type="button" onClick={close} className="rounded-full px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">{copy.passwordResetCancel}</button>
                            <button type="button" onClick={generate} disabled={working} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">{copy.passwordResetConfirm}</button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{copy.passwordResetOnce}</p>
                        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-3 font-mono text-base tracking-wide text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50">{password}</p>
                        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">{copy.passwordResetShare}</p>
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(password);
                                        setCopied(true);
                                    } catch {
                                        setCopied(false);
                                    }
                                }}
                                className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950"
                            >
                                {copied ? copy.passwordCopied : copy.copyPassword}
                            </button>
                            <button type="button" onClick={close} className="rounded-full px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">{copy.closeMenu}</button>
                        </div>
                    </>
                )}
            </dialog>
        </div>
    );
}
