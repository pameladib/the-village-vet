"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { deactivateOwnerAccount, deleteOwnerAccount, reactivateOwnerAccount } from "@/lib/actions/account";
import type { Copy } from "@/lib/i18n";

export default function OwnerAccountClosure({
    userId,
    self,
    deactivated,
    petCount,
    upcomingAppointments,
    openOrders,
    copy,
}: {
    userId: string;
    self: boolean;
    deactivated: boolean;
    petCount: number;
    upcomingAppointments: number;
    openOrders: number;
    copy: Copy;
}) {
    const router = useRouter();
    const [dialog, setDialog] = useState<"deactivate" | "delete" | "reactivate" | null>(null);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function close() {
        if (pending) return;
        setDialog(null);
        setError(null);
    }

    async function leave() {
        await authClient.signOut().catch(() => undefined);
        window.location.assign("/login");
    }

    async function deactivate() {
        setPending(true);
        setError(null);
        const result = await deactivateOwnerAccount(userId);
        setPending(false);
        if (!result.success) {
            setError(copy.deactivateAccountFailed);
            return;
        }
        if (self) {
            await leave();
            return;
        }
        setDialog(null);
        router.refresh();
    }

    async function reactivate() {
        setPending(true);
        setError(null);
        const result = await reactivateOwnerAccount(userId);
        setPending(false);
        if (!result.success) {
            setError(copy.reactivateAccountFailed);
            return;
        }
        setDialog(null);
        router.refresh();
    }

    async function remove() {
        setPending(true);
        setError(null);
        const result = await deleteOwnerAccount(userId);
        setPending(false);
        if (!result.success) {
            setError(result.error === "pets" ? copy.deleteAccountPets : copy.deleteAccountFailed);
            return;
        }
        if (self) {
            await leave();
            return;
        }
        window.location.assign("/admin/patients");
    }

    const deactivateTitle = self ? copy.deactivateAccountOwnAsk : copy.deactivateAccountAsk;
    const deactivateBody = self ? copy.deactivateAccountOwnBody : copy.deactivateAccountBody;
    const deleteTitle = self ? copy.deleteAccountOwnAsk : copy.deleteAccountAsk;

    return (
        <div className="mt-4">
            <div className="flex flex-wrap gap-2">
                {!self && deactivated && (
                    <button type="button" disabled={pending} onClick={() => { setDialog("reactivate"); setError(null); }} className="rounded-full border border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-300 dark:text-emerald-100 dark:hover:bg-emerald-950">
                        {copy.reactivateAccount}
                    </button>
                )}
                {!deactivated && (
                    <button type="button" disabled={pending} onClick={() => { setDialog("deactivate"); setError(null); }} className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-stone-700 hover:border-emerald-700 hover:text-emerald-800 disabled:opacity-60 dark:border-stone-700 dark:text-stone-200 dark:hover:border-emerald-400 dark:hover:text-emerald-200">
                        {copy.deactivateAccount}
                    </button>
                )}
                <button type="button" disabled={pending} onClick={() => { setDialog("delete"); setError(null); }} className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">
                    {copy.deleteAccount}
                </button>
            </div>
            {dialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-4" role="presentation" onClick={close}>
                    <div role="dialog" aria-modal="true" aria-labelledby="account-closure-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg dark:bg-stone-900" onClick={(event) => event.stopPropagation()}>
                        <h2 id="account-closure-title" className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">
                            {dialog === "deactivate" ? deactivateTitle : dialog === "reactivate" ? copy.reactivateAccountAsk : deleteTitle}
                        </h2>
                        <div className="mt-2 space-y-2 text-sm text-stone-600 dark:text-stone-300">
                            {dialog === "deactivate" && <p>{deactivateBody}</p>}
                            {dialog === "reactivate" && <p>{copy.reactivateAccountBody}</p>}
                            {dialog === "delete" && <p>{petCount > 0 ? copy.deleteAccountPets : copy.deleteAccountBody}</p>}
                            {dialog !== "reactivate" && (dialog === "deactivate" || petCount > 0) && upcomingAppointments > 0 && <p>{copy.deactivateAppointments}</p>}
                            {dialog !== "reactivate" && (dialog === "deactivate" || petCount > 0) && openOrders > 0 && <p>{copy.deactivateOrders}</p>}
                            {dialog === "delete" && petCount === 0 && openOrders > 0 && <p>{copy.deleteAccountOrders}</p>}
                        </div>
                        {error && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button type="button" disabled={pending} onClick={close} className="rounded-full px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800">
                                {copy.petDeleteCancel}
                            </button>
                            {dialog === "deactivate" && (
                                <button type="button" disabled={pending} onClick={() => void deactivate()} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                                    {copy.deactivateAccount}
                                </button>
                            )}
                            {dialog === "reactivate" && (
                                <button type="button" disabled={pending} onClick={() => void reactivate()} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                                    {copy.reactivateAccount}
                                </button>
                            )}
                            {dialog === "delete" && petCount === 0 && (
                                <button type="button" disabled={pending} onClick={() => void remove()} className="rounded-full bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60">
                                    {copy.petDeletePermanent}
                                </button>
                            )}
                            {dialog === "delete" && petCount > 0 && !deactivated && (
                                <button type="button" disabled={pending} onClick={() => void deactivate()} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                                    {copy.deactivateAccount}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
