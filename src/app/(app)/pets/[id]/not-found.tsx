import HistoryBack from "@/components/HistoryBack";
import { getLocale, messages } from "@/lib/i18n";

export default async function PetNotFound() {
  const copy = messages(await getLocale());

  return (
    <div className="flex flex-1 items-center justify-center bg-emerald-50 px-4 py-10 dark:bg-stone-950 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white px-6 py-8 text-center shadow-sm dark:border-emerald-900 dark:bg-stone-900">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          {copy.petProfileLabel}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {copy.petMissingTitle}
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
          {copy.petMissingLead}
        </p>
        <HistoryBack
          fallback="/dashboard"
          className="mt-6 inline-flex cursor-pointer rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:bg-emerald-700 dark:hover:bg-emerald-600"
        >
          {copy.bookBack}
        </HistoryBack>
      </div>
    </div>
  );
}
