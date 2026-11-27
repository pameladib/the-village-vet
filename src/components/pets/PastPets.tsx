import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PetCard from "@/components/pets/cards/PetCard";
import type { Copy } from "@/lib/i18n";
import type { PetCardData } from "@/lib/types/pets";

export default function PastPets({ pets, copy }: { pets: PetCardData[]; copy: Copy }) {
    return (
        <div className="flex flex-1 justify-center px-4 py-6 sm:px-6 sm:py-8">
            <div className="w-full max-w-6xl">
                <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline dark:text-emerald-200">
                    <ChevronLeft className="size-4 rtl:rotate-180" strokeWidth={1.75} />
                    {copy.archivedPetsBack}
                </Link>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.pastPets}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">{copy.pastPetsLead}</p>

                {pets.length === 0 ? (
                    <p className="mt-6 text-sm text-stone-500">{copy.pastPetsNone}</p>
                ) : (
                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {pets.map((pet) => (
                            <PetCard key={pet.id} pet={pet} copy={copy} chevron={false} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
