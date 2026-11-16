"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOwnerProfile } from "@/lib/actions/profile";
import type { Copy } from "@/lib/i18n";

const inputClassName =
    "mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 dark:border-emerald-900 dark:bg-stone-950 dark:text-emerald-50";

type ProfileFields = {
    name: string;
    phoneNumber: string;
};

export default function ProfileForm({
    copy,
    username,
    name,
    phoneNumber,
}: {
    copy: Copy;
    username: string;
    name: string;
    phoneNumber: string;
}) {
    const router = useRouter();
    const [form, setForm] = useState<ProfileFields>({ name, phoneNumber });
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);

    function update(field: keyof ProfileFields, value: string) {
        setForm((current) => ({ ...current, [field]: value }));
        setSaved(false);
    }

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
        const result = await updateOwnerProfile(form);
        setSaving(false);
        if (!result.success) {
            setError(result.formErrors[0] === "You need to sign in." ? copy.errSignIn : copy.errProfileFailed);
            return;
        }
        setSaved(true);
        router.refresh();
    }

    return (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {copy.nameLabel}
                <input value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" className={inputClassName} />
            </label>
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {copy.phone}
                <input value={form.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} type="tel" autoComplete="tel" placeholder="07XX XXX XXX" className={inputClassName} />
            </label>
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {copy.username}
                <input value={username} readOnly className={`${inputClassName} text-stone-500`} />
                <span className="mt-1 block text-xs font-normal text-emerald-800 dark:text-emerald-200">{copy.profileUsernameFixed}</span>
            </label>
            {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
            {saved && <p className="text-sm text-emerald-800 dark:text-emerald-200">{copy.profileSaved}</p>}
            <button
                type="submit"
                disabled={saving}
                className="w-fit rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white transition duration-200 hover:scale-[1.02] hover:bg-emerald-900 hover:shadow-md disabled:scale-100 disabled:opacity-60"
            >
                {saving ? copy.profileSaving : copy.profileSave}
            </button>
        </form>
    );
}
