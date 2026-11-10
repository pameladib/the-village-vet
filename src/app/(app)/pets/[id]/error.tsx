"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function PetProfileError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center bg-emerald-50 px-4 py-10 dark:bg-stone-950 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white px-6 py-8 text-center shadow-sm dark:border-emerald-900 dark:bg-stone-900">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          Pet profile
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          We couldn&apos;t load this pet
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
          Something went wrong while loading this profile. Try again, or go back to your pets.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="cursor-pointer rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}