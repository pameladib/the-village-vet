"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setOrderPaid } from "@/lib/actions/shop";
import type { Copy } from "@/lib/i18n";
import { mapShopError } from "./ShopAdmin";

const primary = "inline-flex h-10 items-center rounded-full bg-emerald-900 px-4 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60";
const quiet = "inline-flex h-10 items-center rounded-full border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800";

export default function OrderPayment({ orderId, paid, copy }: { orderId: string; paid: boolean; copy: Copy }) {
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function save(next: boolean) {
        setPending(true);
        setError(null);
        const result = await setOrderPaid(orderId, next);
        setPending(false);
        setConfirm(false);
        if (!result.success) {
            setError(mapShopError(result.formErrors?.[0], copy));
            return;
        }
        toast.success(next ? copy.shopPayPaid : copy.shopPayUnpaid);
        router.refresh();
    }

    return (
        <div className={confirm ? "basis-full" : "shrink-0"}>
            {confirm ? (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <p>{copy.shopUnpaidConfirm}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={pending} onClick={() => void save(false)} className="inline-flex h-10 items-center rounded-full bg-amber-900 px-4 text-sm font-medium text-white hover:bg-amber-950 disabled:opacity-60">{copy.shopMarkUnpaid}</button>
                        <button type="button" disabled={pending} onClick={() => setConfirm(false)} className={quiet}>{copy.shopKeepPaid}</button>
                    </div>
                </div>
            ) : paid ? (
                <button type="button" disabled={pending} onClick={() => setConfirm(true)} className={quiet}>{copy.shopMarkUnpaid}</button>
            ) : (
                <button type="button" disabled={pending} onClick={() => void save(true)} className={primary}>{copy.shopMarkPaid}</button>
            )}
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
    );
}
