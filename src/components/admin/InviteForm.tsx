"use client";

import { useState } from "react";
import { createOwnerInvite } from "@/lib/actions/invite";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";

const field = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

type CreatedLink = {
    id: string;
    name: string;
    url: string;
    expiresAt: string;
};

export default function InviteForm({ copy, locale, appUrl }: { copy: Copy; locale: Locale; appUrl: string | null }) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [links, setLinks] = useState<CreatedLink[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copyErrorId, setCopyErrorId] = useState<string | null>(null);

    const expires = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        dateStyle: "medium",
        timeStyle: "short",
    });

    async function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setCopiedId(null);
        setCopyErrorId(null);
        if (!name.trim()) {
            setError(copy.inviteNameError);
            return;
        }
        if (phone.trim().length < 6) {
            setError(copy.invitePhoneError);
            return;
        }
        if (!appUrl) {
            setError(copy.inviteAppUrlMissing);
            return;
        }
        setPending(true);
        const result = await createOwnerInvite({ name, phoneNumber: phone });
        setPending(false);
        if (!result.success) {
            setError(copy.inviteError);
            return;
        }
        setLinks((current) => [
            {
                id: crypto.randomUUID(),
                name: name.trim(),
                url: `${appUrl}${result.path}`,
                expiresAt: result.expiresAt,
            },
            ...current,
        ]);
        setName("");
        setPhone("");
    }

    async function copyLink(link: CreatedLink) {
        setCopyErrorId(null);
        try {
            await navigator.clipboard.writeText(link.url);
            setCopiedId(link.id);
        } catch {
            setCopiedId(null);
            setCopyErrorId(link.id);
        }
    }

    return (
        <div className="mt-6 flex flex-col gap-4">
            <form onSubmit={onSubmit} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-stone-900 sm:p-6">
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
                    {copy.inviteName}
                    <input
                        name="name"
                        required
                        maxLength={80}
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        disabled={pending}
                        className={field}
                    />
                </label>
                <label className="mt-4 block text-sm font-medium text-stone-700 dark:text-stone-200">
                    {copy.invitePhone}
                    <input
                        name="phoneNumber"
                        type="tel"
                        required
                        maxLength={30}
                        autoComplete="tel"
                        dir="ltr"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        disabled={pending}
                        className={`${field} text-left`}
                    />
                </label>
                {error && <p className="mt-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
                <button
                    type="submit"
                    disabled={pending}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60"
                >
                    {pending ? copy.inviteCreating : copy.inviteCreate}
                </button>
            </form>

            {links.map((link) => (
                <section key={link.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950 sm:p-6">
                    <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-50">{copy.inviteCreated}</h2>
                    <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100">{copy.inviteOnce}</p>
                    <p className="mt-2 text-sm font-medium text-emerald-950 dark:text-emerald-50">{copy.inviteFor.replace("{name}", link.name)}</p>
                    <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100">{copy.inviteExpires.replace("{when}", expires.format(new Date(link.expiresAt)))}</p>
                    <div dir="ltr" className="mt-4 overflow-x-auto rounded-xl bg-white px-3 py-2.5 text-left dark:bg-stone-950">
                        <p className="w-max font-mono text-sm text-stone-800 dark:text-stone-100">{link.url}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => copyLink(link)}
                            className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950"
                        >
                            {copy.inviteCopy}
                        </button>
                        <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-full border border-emerald-900 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 dark:border-emerald-300 dark:text-emerald-100 dark:hover:bg-emerald-900"
                        >
                            {copy.inviteOpen}
                        </a>
                    </div>
                    {copiedId === link.id && <p className="mt-3 text-sm font-medium text-emerald-800 dark:text-emerald-200">{copy.inviteCopied}</p>}
                    {copyErrorId === link.id && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{copy.inviteCopyError}</p>}
                </section>
            ))}
        </div>
    );
}
