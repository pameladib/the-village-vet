"use client";

import { useState } from "react";
import { saveClinicSettings } from "@/lib/actions/clinic";
import type { Copy } from "@/lib/i18n";

const field = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

export default function ClinicSettingsForm({
    copy,
    phone,
    whatsapp,
    email,
    address,
    mapsUrl,
    about,
}: {
    copy: Copy;
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    mapsUrl: string;
    about: string;
}) {
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    return (
        <form
            className="mt-6 flex max-w-lg flex-col gap-4"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const result = await saveClinicSettings({
                    phone: String(form.get("phone") ?? ""),
                    whatsapp: String(form.get("whatsapp") ?? ""),
                    email: String(form.get("email") ?? ""),
                    address: String(form.get("address") ?? ""),
                    mapsUrl: String(form.get("mapsUrl") ?? ""),
                    about: String(form.get("about") ?? ""),
                });
                setError(result.success ? null : result.formErrors[0] ?? "Could not save.");
                setMessage(result.success ? copy.profileSaved : null);
            }}
        >
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {copy.phone}
                <input name="phone" type="tel" defaultValue={phone} className={field} />
            </label>
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {copy.whatsapp}
                <input name="whatsapp" type="tel" defaultValue={whatsapp} className={field} />
            </label>
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {copy.footerEmail}
                <input name="email" type="email" defaultValue={email} className={field} />
            </label>
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {copy.addressHeading}
                <input name="address" defaultValue={address} className={field} />
            </label>
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {copy.clinicMapLink}
                <input name="mapsUrl" type="url" defaultValue={mapsUrl} className={field} />
            </label>
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {copy.aboutHeading}
                <textarea name="about" defaultValue={about} rows={5} className={field} />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            {message && <p className="text-sm text-emerald-800">{message}</p>}
            <button type="submit" className="w-fit rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-950">
                {copy.profileSave}
            </button>
        </form>
    );
}
