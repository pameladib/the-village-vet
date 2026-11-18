"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const text = {
  en: {
    label: "Pet profile",
    title: "We couldn't load this pet",
    lead: "Something went wrong while loading this profile. Try again, or go back to your pets.",
    retry: "Try again",
    back: "Back to dashboard",
  },
  ar: {
    label: "ملف الحيوان",
    title: "تعذّر تحميل هذا الحيوان",
    lead: "حدث خطأ أثناء تحميل هذا الملف. أعيدوا المحاولة، أو عودوا إلى حيواناتكم.",
    retry: "أعيدوا المحاولة",
    back: "العودة إلى لوحتي",
  },
};

export default function PetProfileError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [arabic, setArabic] = useState(false);

  useEffect(() => {
    console.error(error);
    setArabic(document.documentElement.lang === "ar");
  }, [error]);

  const copy = arabic ? text.ar : text.en;

  return (
    <div className="flex flex-1 items-center justify-center bg-emerald-50 px-4 py-10 dark:bg-stone-950 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white px-6 py-8 text-center shadow-sm dark:border-emerald-900 dark:bg-stone-900">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          {copy.label}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
          {copy.lead}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="cursor-pointer rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            {copy.retry}
          </button>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
          >
            {copy.back}
          </Link>
        </div>
      </div>
    </div>
  );
}