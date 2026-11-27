import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import SpeciesMark from "@/components/pets/SpeciesMark";
import type { Copy } from "@/lib/i18n";
import { petPhotoSrc } from "@/lib/storage/files";
import { pageKey } from "@/lib/slug";
import type { PetCardData } from "@/lib/types/pets";

export default function PetCard({ pet, copy, badge, trailing, chevron = true }: { pet: PetCardData; copy: Copy; badge?: string; trailing?: ReactNode; chevron?: boolean }) {
    const photo = petPhotoSrc(pet.id, pet.photoUrl);
    const breed = pet.breed?.trim();
    const species = pet.species === "CAT" ? copy.speciesCat : copy.speciesDog;

    return (
        <div className={`group relative flex gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition duration-200 hover:z-10 hover:scale-[1.02] hover:shadow-md focus-within:z-10 focus-within:scale-[1.02] focus-within:shadow-md dark:border-stone-700 dark:bg-stone-950 ${trailing ? "flex-col sm:flex-row sm:items-center" : "items-center"}`}>
            <Link
                href={`/pets/${pageKey(pet)}`}
                aria-label={pet.name}
                className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40"
            />
            <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-3">
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
                    {badge && <p className="mt-1 truncate text-xs font-medium text-stone-500">{badge}</p>}
                </div>
                {chevron && <ChevronRight className="size-4 shrink-0 text-stone-400 transition group-hover:text-emerald-800 rtl:rotate-180 dark:group-hover:text-emerald-200" />}
            </div>
            {trailing && <div className="relative z-10">{trailing}</div>}
        </div>
    );
}
