"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCustomerAccount } from "@/lib/actions/owners";
import { ownerChat } from "@/lib/clinic/phone";
import type { Copy } from "@/lib/i18n";

const inputClassName = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

export default function OwnerAccountForm({
    copy,
    userId,
    name,
    phoneNumber,
    username,
    canEdit,
}: {
    copy: Copy;
    userId: string;
    name: string;
    phoneNumber: string;
    username: string;
    canEdit: boolean;
}) {
    const router = useRouter();
    const [form, setForm] = useState({ name, phoneNumber });
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const chat = ownerChat(form.phoneNumber);

    async function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSaved(false);
        if (!form.name.trim()) {
            setError(copy.errNameRequired);
            return;
        }
        if (!form.phoneNumber.trim()) {
            setError(copy.errPhoneRequired);
            return;
        }
        setSaving(true);
        const result = await updateCustomerAccount(userId, form);
        setSaving(false);
        if (!result.success) {
            setError(result.error === "name" ? copy.errNameRequired : result.error === "phone" ? copy.errPhoneRequired : copy.errProfileFailed);
            return;
        }
        setSaved(true);
        router.refresh();
    }

    return (
        <form onSubmit={onSubmit} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-stone-500">
                {copy.nameLabel}
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} readOnly={!canEdit} autoComplete="name" className={inputClassName} />
            </label>
            <div className="text-sm text-stone-500">
                <label>
                    {copy.phone}
                    <input value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} readOnly={!canEdit} type="tel" autoComplete="tel" className={inputClassName} />
                </label>
                {chat && (
                    <a href={chat} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex font-medium text-emerald-900 hover:underline dark:text-emerald-200">
                        {copy.whatsappOwner.replace("{phone}", form.phoneNumber)}
                    </a>
                )}
            </div>
            <div className="text-sm text-stone-500 sm:col-span-2">
                <p>{copy.username}</p>
                <p dir="ltr" className="mt-1 rounded-xl bg-stone-100 px-3 py-2.5 text-left text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">{username}</p>
            </div>
            {canEdit && (
                <div className="sm:col-span-2">
                    {error && <p className="mb-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
                    {saved && <p className="mb-2 text-sm text-emerald-800 dark:text-emerald-200">{copy.profileSaved}</p>}
                    <button type="submit" disabled={saving} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                        {saving ? copy.profileSaving : copy.profileSave}
                    </button>
                </div>
            )}
        </form>
    );
}
