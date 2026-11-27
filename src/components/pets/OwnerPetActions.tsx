"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archivePet, deletePet, restorePet } from "@/lib/actions/pet-removal";
import ArchivePetDetails from "@/components/pets/ArchivePetDetails";
import type { Copy } from "@/lib/i18n";

export default function OwnerPetActions({
    petId,
    petName,
    canArchive,
    canRestore,
    hasHistory,
    backHref,
    copy,
}: {
    petId: string;
    petName: string;
    canArchive: boolean;
    canRestore: boolean;
    hasHistory: boolean;
    backHref: string;
    copy: Copy;
}) {
    const router = useRouter();
    const [dialog, setDialog] = useState<"archive" | "delete" | null>(null);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function close() {
        if (pending) return;
        setDialog(null);
        setError(null);
    }

    async function archive() {
        setPending(true);
        setError(null);
        const result = await archivePet(petId);
        setPending(false);
        if (!result.success) {
            setError(copy.petArchiveFailed);
            return;
        }
        setDialog(null);
        router.refresh();
    }

    async function restore() {
        setPending(true);
        setError(null);
        const result = await restorePet(petId);
        setPending(false);
        if (!result.success) {
            setError(copy.petRestoreFailed);
            return;
        }
        router.refresh();
    }

    async function remove() {
        setPending(true);
        setError(null);
        const result = await deletePet(petId);
        setPending(false);
        if (!result.success) {
            setError(result.error === "history" ? copy.petDeleteHistoryBody : copy.petDeleteFailed);
            return;
        }
        router.push(backHref);
    }

    const deleteTitle = hasHistory ? copy.petDeleteHistoryTitle : copy.petDeleteNamed.replace("{name}", petName);
    const deleteBody = hasHistory ? copy.petDeleteHistoryBody : copy.petDeleteOwnerBody;

    return (
        <>
            {canArchive && (
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => { setDialog("archive"); setError(null); }}
                    className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:border-emerald-700 hover:text-emerald-800 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-emerald-400 dark:hover:text-emerald-200"
                >
                    {copy.archivePet}
                </button>
            )}
            {canRestore && (
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => void restore()}
                    className="inline-flex items-center rounded-full border border-emerald-700 bg-white px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-400 dark:bg-stone-900 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                >
                    {copy.restorePet}
                </button>
            )}
            <button
                type="button"
                disabled={pending}
                onClick={() => { setDialog("delete"); setError(null); }}
                className="inline-flex items-center rounded-full border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:bg-stone-900 dark:text-red-300 dark:hover:bg-red-950"
            >
                {copy.deletePet}
            </button>
            {error && !dialog && <p className="w-full text-end text-sm text-red-700 dark:text-red-300">{error}</p>}
            {dialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4" role="presentation" onClick={close}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="owner-pet-action-title"
                        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg dark:bg-stone-900"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 id="owner-pet-action-title" className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">
                            {dialog === "archive" ? copy.archivePetAsk.replaceAll("{name}", petName) : deleteTitle}
                        </h2>
                        {dialog === "archive" ? <ArchivePetDetails name={petName} copy={copy} /> : <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{deleteBody}</p>}
                        {error && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button type="button" disabled={pending} onClick={close} className="rounded-full px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800">
                                {copy.petDeleteCancel}
                            </button>
                            {dialog === "delete" && !hasHistory && (
                                <button type="button" disabled={pending} onClick={() => void remove()} className="rounded-full bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60">
                                    {copy.petDeletePermanent}
                                </button>
                            )}
                            {dialog === "archive" && (
                                <button type="button" disabled={pending} onClick={() => void archive()} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                                    {copy.archivePetConfirm}
                                </button>
                            )}
                            {dialog === "delete" && canArchive && (
                                <button type="button" disabled={pending} onClick={() => { setDialog("archive"); setError(null); }} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                                    {copy.petArchiveInstead}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
