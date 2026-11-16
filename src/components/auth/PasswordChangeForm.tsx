"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/auth/PasswordInput";
import { replaceTemporaryPassword } from "@/lib/actions/owners";
import type { Copy } from "@/lib/i18n";

const inputClassName = "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

export default function PasswordChangeForm({ copy }: { copy: Copy }) {
    const router = useRouter();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    async function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        if (newPassword.length < 8) {
            setError(copy.errPasswordShort);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(copy.passwordsDiffer);
            return;
        }
        setSaving(true);
        const result = await replaceTemporaryPassword({ newPassword });
        setSaving(false);
        if (!result.success) {
            setError(result.error === "short" ? copy.errPasswordShort : result.error === "same" ? copy.errPasswordSame : copy.errProfileFailed);
            return;
        }
        router.replace("/dashboard");
        router.refresh();
    }

    return (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <label className="text-sm text-stone-600 dark:text-stone-300">
                {copy.newPassword}
                <PasswordInput value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" showLabel={copy.showPassword} hideLabel={copy.hidePassword} wrapperClassName="mt-1" className={inputClassName} />
            </label>
            <label className="text-sm text-stone-600 dark:text-stone-300">
                {copy.confirmPassword}
                <PasswordInput value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" showLabel={copy.showPassword} hideLabel={copy.hidePassword} wrapperClassName="mt-1" className={inputClassName} />
            </label>
            {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
            <button type="submit" disabled={saving} className="rounded-full bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                {saving ? copy.profileSaving : copy.profileSave}
            </button>
        </form>
    );
}
