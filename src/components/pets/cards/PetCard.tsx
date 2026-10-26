import Link from "next/link";
import type { PetCardData } from "@/lib/types/pets";

export default function PetCard({ pet }: { pet: PetCardData }) {
  return (
    <Link
      href={`/pets/${pet.id}`}
      className="group block w-28 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition duration-200 hover:scale-[1.03] hover:border-emerald-700 hover:bg-emerald-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-emerald-400 dark:hover:bg-emerald-950/40"
    >
      <div className="aspect-square bg-stone-100 dark:bg-stone-800">
        {pet.photoUrl ? (
          <img src={pet.photoUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-emerald-100 text-xl font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            {pet.name.slice(0, 1)}
          </div>
        )}
      </div>
      <p className="truncate px-3 py-2.5 text-sm font-medium text-stone-900 group-hover:text-emerald-800 dark:text-stone-50 dark:group-hover:text-emerald-300">
        {pet.name}
      </p>
    </Link>
  );
}
