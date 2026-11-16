import { ChevronRight } from "lucide-react";
import Link from "next/link";
import SpeciesMark from "@/components/pets/SpeciesMark";
import type { Copy } from "@/lib/i18n";
import { petPhotoSrc } from "@/lib/storage/files";
import type { PetCardData } from "@/lib/types/pets";

export default function PetCard({ pet, copy }: { pet: PetCardData; copy: Copy }) {
    const photo = petPhotoSrc(pet.id, pet.photoUrl);
    const breed = pet.breed?.trim();
    const species = pet.species === "CAT" ? copy.speciesCat : copy.speciesDog;

    return (
        <Link
            href={`/pets/${pet.id}`}
            className="group flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition duration-200 hover:border-emerald-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:border-stone-700 dark:bg-stone-950 dark:hover:border-emerald-400"
        >
            <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                {photo ? (
                    <img src={photo} alt="" className="size-full object-cover" />
                ) : (
                    <div className="flex size-full items-center justify-center">
                        <SpeciesMark species={pet.species} className="size-9" />
                    </div>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-emerald-950 group-hover:text-emerald-800 dark:text-emerald-50 dark:group-hover:text-emerald-200">
                    {pet.name}
                </p>
                <p className="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400">
                    {species}
                    {breed ? ` · ${breed}` : ""}
                </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-stone-400 transition group-hover:text-emerald-800 rtl:rotate-180 dark:group-hover:text-emerald-200" />
        </Link>
    );
}
