"use client";

import { useState } from "react";
import { saveClinicSettings } from "@/lib/actions/clinic";

export default function ClinicSettingsForm({
    phone,
    whatsapp,
    address,
    mapsUrl,
    emergencyPhone,
    about,
}: {
    phone: string;
    whatsapp: string;
    address: string;
    mapsUrl: string;
    emergencyPhone: string;
    about: string;
}) {
    const [message, setMessage] = useState<string | null>(null);

    return (
        <form
            className="mt-4 flex max-w-lg flex-col gap-2"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const result = await saveClinicSettings({
                    phone: String(form.get("phone") ?? ""),
                    whatsapp: String(form.get("whatsapp") ?? ""),
                    address: String(form.get("address") ?? ""),
                    mapsUrl: String(form.get("mapsUrl") ?? ""),
                    emergencyPhone: String(form.get("emergencyPhone") ?? ""),
                    about: String(form.get("about") ?? ""),
                });
                setMessage(result.success ? "Saved." : result.formErrors[0] ?? "Could not save.");
            }}
        >
            <input name="phone" defaultValue={phone} placeholder="Phone" className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
            <input name="whatsapp" defaultValue={whatsapp} placeholder="WhatsApp" className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
            <input name="address" defaultValue={address} placeholder="Address" className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
            <input name="mapsUrl" defaultValue={mapsUrl} placeholder="https://maps.google.com/..." className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
            <input name="emergencyPhone" defaultValue={emergencyPhone} placeholder="Emergency phone, if the clinic has one" className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
            <textarea name="about" defaultValue={about} placeholder="About the clinic" className="min-h-28 rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
            <p className="text-xs text-stone-500">Leave the emergency number empty until the clinic gives you one. The public page will say it is not configured.</p>
            {message && <p className="text-sm text-emerald-800">{message}</p>}
            <button type="submit" className="w-fit rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white">Save</button>
        </form>
    );
}
