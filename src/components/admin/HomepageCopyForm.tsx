"use client";

import { useState } from "react";
import { saveHomepageCopy } from "@/lib/actions/clinic";
import type { Copy } from "@/lib/i18n";

const field = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

export type HomepageFields = {
    heroTitleEn: string;
    heroTitleAr: string;
    heroBodyEn: string;
    heroBodyAr: string;
    aboutLeadEn: string;
    aboutLeadAr: string;
    aboutBodyEn: string;
    aboutBodyAr: string;
};

function Pair({
    label,
    english,
    arabic,
    nameEn,
    nameAr,
    rows,
    copy,
}: {
    label: string;
    english: string;
    arabic: string;
    nameEn: string;
    nameAr: string;
    rows?: number;
    copy: Copy;
}) {
    const control = rows ? "textarea" : "input";
    return (
        <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{label}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                    {copy.homepageEnglish}
                    {control === "textarea" ? (
                        <textarea name={nameEn} dir="ltr" rows={rows} defaultValue={english} className={field} />
                    ) : (
                        <input name={nameEn} dir="ltr" defaultValue={english} className={field} />
                    )}
                </label>
                <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                    {copy.homepageArabic}
                    {control === "textarea" ? (
                        <textarea name={nameAr} dir="rtl" rows={rows} defaultValue={arabic} className={field} />
                    ) : (
                        <input name={nameAr} dir="rtl" defaultValue={arabic} className={field} />
                    )}
                </label>
            </div>
        </fieldset>
    );
}

export default function HomepageCopyForm({ copy, values }: { copy: Copy; values: HomepageFields }) {
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    return (
        <form
            className="mt-6 flex flex-col gap-6"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const result = await saveHomepageCopy({
                    heroTitleEn: String(form.get("heroTitleEn") ?? ""),
                    heroTitleAr: String(form.get("heroTitleAr") ?? ""),
                    heroBodyEn: String(form.get("heroBodyEn") ?? ""),
                    heroBodyAr: String(form.get("heroBodyAr") ?? ""),
                    aboutLeadEn: String(form.get("aboutLeadEn") ?? ""),
                    aboutLeadAr: String(form.get("aboutLeadAr") ?? ""),
                    aboutBodyEn: String(form.get("aboutBodyEn") ?? ""),
                    aboutBodyAr: String(form.get("aboutBodyAr") ?? ""),
                });
                if (!result.success) {
                    setMessage(null);
                    setError(copy.homepageSaveError);
                    return;
                }
                setError(null);
                setMessage(copy.profileSaved);
            }}
        >
            <Pair label={copy.homepageHeroTitle} english={values.heroTitleEn} arabic={values.heroTitleAr} nameEn="heroTitleEn" nameAr="heroTitleAr" copy={copy} />
            <Pair label={copy.homepageHeroText} english={values.heroBodyEn} arabic={values.heroBodyAr} nameEn="heroBodyEn" nameAr="heroBodyAr" rows={3} copy={copy} />
            <Pair label={copy.homepageAboutLead} english={values.aboutLeadEn} arabic={values.aboutLeadAr} nameEn="aboutLeadEn" nameAr="aboutLeadAr" rows={2} copy={copy} />
            <Pair label={copy.homepageAboutText} english={values.aboutBodyEn} arabic={values.aboutBodyAr} nameEn="aboutBodyEn" nameAr="aboutBodyAr" rows={3} copy={copy} />
            {error && <p className="text-sm text-red-700">{error}</p>}
            {message && <p className="text-sm text-emerald-800">{message}</p>}
            <button type="submit" className="w-fit rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-950">
                {copy.profileSave}
            </button>
        </form>
    );
}
