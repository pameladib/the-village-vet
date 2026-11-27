"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { restorePet } from "@/lib/actions/pet-removal";
import PetCard from "@/components/pets/cards/PetCard";
import type { Copy } from "@/lib/i18n";
import type { PetCardData } from "@/lib/types/pets";

export default function ArchivedPets({ pets, copy }: { pets: PetCardData[]; copy: Copy }) {
    const router = useRouter();
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const confirming = pets.find((pet) => pet.id === confirmId) ?? null;

    async function confirmRestore() {
        if (!confirming || pendingId) return;
        setPendingId(confirming.id);
        setError(null);
        const result = await restorePet(confirming.id);
        setPendingId(null);
        if (!result.success) {
            setError(copy.petRestoreFailed);
            return;
        }
        setConfirmId(null);
        router.refresh();
    }

    return (
        <div className="flex flex-1 justify-center px-4 py-6 sm:px-6 sm:py-8">
            <div className="w-full max-w-6xl">
                <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline dark:text-emerald-200">
                    <ChevronLeft className="size-4 rtl:rotate-180" strokeWidth={1.75} />
                    {copy.archivedPetsBack}
                </Link>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.archivedPets}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300">{copy.archivedPetsLead}</p>

                {pets.length === 0 ? (
                    <p className="mt-6 text-sm text-stone-500">{copy.archivedPetsNone}</p>
                ) : (
                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {pets.map((pet) => (
                            <PetCard
                                key={pet.id}
                                pet={pet}
                                copy={copy}
                                chevron={false}
                                trailing={(
                                    <button
                                        type="button"
                                        disabled={pendingId !== null}
                                        onClick={() => { setConfirmId(pet.id); setError(null); }}
                                        className="shrink-0 rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60"
                                    >
                                        {copy.restorePet}
                                    </button>
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>

            {confirming && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4" role="presentation" onClick={() => { if (!pendingId) setConfirmId(null); }}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="restore-pet-title"
                        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg dark:bg-stone-900"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 id="restore-pet-title" className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">{copy.restorePetAsk}</h2>
                        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{copy.restorePetBody}</p>
                        <p className="mt-3 text-sm font-medium text-stone-800 dark:text-stone-100">{confirming.name}</p>
                        {error && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button type="button" disabled={pendingId !== null} onClick={() => setConfirmId(null)} className="rounded-full px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800">
                                {copy.petDeleteCancel}
                            </button>
                            <button type="button" disabled={pendingId !== null} onClick={() => void confirmRestore()} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                                {copy.restorePet}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
