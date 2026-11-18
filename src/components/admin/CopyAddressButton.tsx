"use client";

import { useState } from "react";
import type { Copy } from "@/lib/i18n";

export default function CopyAddressButton({ url, copy }: { url: string; copy: Copy }) {
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState(false);

    async function copyAddress() {
        setError(false);
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        } catch {
            setCopied(false);
            setError(true);
        }
    }

    return (
        <div>
            <button type="button" onClick={copyAddress} className="inline-flex items-center justify-center rounded-full border border-emerald-900 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 dark:border-emerald-300 dark:text-emerald-100 dark:hover:bg-emerald-950">
                {copy.inviteInstallCopy}
            </button>
            {copied && <p className="mt-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">{copy.inviteInstallCopied}</p>}
            {error && <p className="mt-2 text-sm text-red-700 dark:text-red-300">{copy.inviteInstallCopyError}</p>}
        </div>
    );
}
