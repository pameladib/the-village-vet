"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archivePet, deletePet, restorePet } from "@/lib/actions/pet-removal";
import ArchivePetDetails from "@/components/pets/ArchivePetDetails";
import type { Copy } from "@/lib/i18n";

export default function PetLifecycle({
    petId,
    petName,
    archived,
    canArchive = false,
    canRestore = false,
    hasHistory,
    isAdmin,
    backHref,
    copy,
}: {
    petId: string;
    petName: string;
    archived: boolean;
    canArchive?: boolean;
    canRestore?: boolean;
    hasHistory: boolean;
    isAdmin: boolean;
    backHref: string;
    copy: Copy;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function close() {
        if (pending) return;
        setOpen(false);
        setConfirming(false);
        setArchiving(false);
        setError(null);
    }

    async function run(action: () => Promise<{ success: boolean; error?: string }>, failure: string) {
        setPending(true);
        setError(null);
        const result = await action();
        setPending(false);
        if (!result.success) {
            setError(result.error === "history" ? copy.petDeleteHistoryBody : failure);
            return;
        }
        close();
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

    const title = confirming
        ? copy.petDeleteConfirmTitle
        : isAdmin
            ? copy.petDeleteAdminTitle
            : hasHistory
                ? copy.petDeleteHistoryTitle
                : copy.petDeleteTitle;
    const body = confirming
        ? (hasHistory ? copy.petDeleteConfirmHistory : copy.petDeleteConfirmBody)
        : isAdmin
            ? (hasHistory ? copy.petDeleteAdminHistory : copy.petDeleteAdminBody)
            : hasHistory
                ? copy.petDeleteHistoryBody
                : copy.petDeleteOwnerBody;

    return (
        <>
            {canRestore && (
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => void run(() => restorePet(petId), copy.petRestoreFailed)}
                    className="inline-flex items-center rounded-full border border-emerald-700 bg-white px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-400 dark:bg-stone-900 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                >
                    {copy.restorePet}
                </button>
            )}
            <button
                type="button"
                onClick={() => { setOpen(true); setConfirming(false); setError(null); }}
                className="inline-flex items-center rounded-full border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-stone-900 dark:text-red-300 dark:hover:bg-red-950"
            >
                {copy.deletePet}
            </button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4" role="presentation" onClick={close}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pet-lifecycle-title"
                        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg dark:bg-stone-900"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 id="pet-lifecycle-title" className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">
                            {archiving ? copy.archivePetAsk.replaceAll("{name}", petName) : title}
                        </h2>
                        {archiving ? <ArchivePetDetails name={petName} copy={copy} /> : <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{body}</p>}
                        {error && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            {archiving ? (
                                <>
                                    <button type="button" disabled={pending} onClick={() => { setArchiving(false); setError(null); }} className="rounded-full px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800">
                                        {copy.petDeleteCancel}
                                    </button>
                                    <button type="button" disabled={pending} onClick={() => void run(() => archivePet(petId), copy.petArchiveFailed)} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                                        {copy.archivePetConfirm}
                                    </button>
                                </>
                            ) : confirming ? (
                                <>
                                    <button type="button" disabled={pending} onClick={() => { setConfirming(false); setError(null); }} className="rounded-full px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800">
                                        {copy.petDeleteBack}
                                    </button>
                                    <button type="button" disabled={pending} onClick={() => void remove()} className="rounded-full bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60">
                                        {copy.petDeletePermanent}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button type="button" disabled={pending} onClick={close} className="rounded-full px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800">
                                        {copy.petDeleteCancel}
                                    </button>
                                    {(isAdmin || hasHistory) && canArchive && (
                                        <button type="button" disabled={pending} onClick={() => { setArchiving(true); setError(null); }} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                                            {copy.archivePet}
                                        </button>
                                    )}
                                    {(isAdmin || !hasHistory) && (
                                        <button
                                            type="button"
                                            disabled={pending}
                                            onClick={() => {
                                                if (isAdmin) {
                                                    setConfirming(true);
                                                    setError(null);
                                                    return;
                                                }
                                                void remove();
                                            }}
                                            className="rounded-full bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
                                        >
                                            {copy.petDeletePermanent}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
