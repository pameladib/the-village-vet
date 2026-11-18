"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const text = {
  en: {
    title: "Something went wrong",
    lead: "We couldn't finish loading this page. Try again, or go back to sign in.",
    retry: "Try again",
    signIn: "Go to sign in",
  },
  ar: {
    title: "حدث خطأ",
    lead: "تعذّر إكمال تحميل هذه الصفحة. أعيدوا المحاولة، أو عودوا إلى تسجيل الدخول.",
    retry: "أعيدوا المحاولة",
    signIn: "الانتقال إلى تسجيل الدخول",
  },
};

export default function AppError({
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
          The Village Vet
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
            href="/login"
            className="text-sm font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
          >
            {copy.signIn}
          </Link>
        </div>
      </div>
    </div>
  );
}
