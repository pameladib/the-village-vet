"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, X } from "lucide-react";
import { toast } from "sonner";
import { advanceOrder, cancelOrder, cancelStaffOrder } from "@/lib/actions/shop";
import type { Copy } from "@/lib/i18n";
import { adminMoves, customerCanCancel, type OrderOrigin } from "@/lib/shop/lifecycle";
import { mapShopError } from "./ShopAdmin";

const primary = "inline-flex h-10 items-center rounded-full bg-emerald-900 px-4 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60";
const quiet = "inline-flex h-10 items-center rounded-full border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800";
const danger = "inline-flex h-10 items-center rounded-full border border-red-300 bg-white px-4 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-950/40";
const dangerSolid = "inline-flex h-10 items-center rounded-full bg-red-800 px-4 text-sm font-medium text-white hover:bg-red-900 disabled:opacity-60";

export default function OrderControls({
    orderId,
    status,
    fulfillment,
    role,
    copy,
    origin,
    staffCancel,
}: {
    orderId: string;
    status: string;
    fulfillment: string;
    role: "staff" | "customer";
    copy: Copy;
    origin: OrderOrigin;
    staffCancel: boolean;
}) {
    const router = useRouter();
    const viewer = useRef<HTMLDialogElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [openReceipt, setOpenReceipt] = useState(false);
    const [confirm, setConfirm] = useState<"REJECTED" | "FULFILLED" | "CANCELLED" | null>(null);
    const moves = role === "staff" ? adminMoves(status, fulfillment) : [];
    const cancelAllowed = role === "customer" && customerCanCancel(status);
    const cancelClosed = role === "customer" && origin === "customer" && !cancelAllowed && status !== "REJECTED" && status !== "CANCELLED";
    const receipt = `/shop/orders/${orderId}/receipt`;

    async function run(action: () => Promise<{ success: boolean; formErrors?: string[]; status?: string }>, done: string) {
        setPending(true);
        setError(null);
        const result = await action();
        setPending(false);
        setConfirm(null);
        if (!result.success) {
            setError(mapShopError(result.formErrors?.[0], copy));
            return;
        }
        toast.success(done);
        router.refresh();
    }

    function ask(next: "APPROVED" | "REJECTED" | "OUT_FOR_DELIVERY" | "READY_FOR_PICKUP" | "FULFILLED") {
        if (next === "REJECTED" || next === "FULFILLED") {
            setConfirm(next);
            return;
        }
        const done = next === "APPROVED" ? copy.shopStatusApproved : next === "OUT_FOR_DELIVERY" ? copy.shopStatusOut : copy.shopStatusReady;
        void run(() => advanceOrder(orderId, next), done);
    }

    const label = {
        APPROVED: copy.shopApprove,
        REJECTED: copy.shopReject,
        OUT_FOR_DELIVERY: copy.shopMarkOut,
        READY_FOR_PICKUP: copy.shopMarkReady,
        FULFILLED: copy.shopMarkCompleted,
    };
    const showActions = confirm != null || moves.length > 0 || cancelAllowed || staffCancel || cancelClosed;
    const destructiveConfirm = confirm === "REJECTED" || confirm === "CANCELLED";
    const cardRow = error ? "lg:row-start-2" : "lg:row-start-1";

    return (
        <div className={showActions ? "grid items-stretch gap-4 lg:grid-cols-2 lg:[direction:ltr]" : "grid gap-4"}>
            {error && <p className="text-sm text-red-700 lg:col-span-2 rtl:lg:[direction:rtl]">{error}</p>}
            <section className={`order-2 h-full rounded-2xl border border-[#E5E7EB] bg-white p-4 lg:order-none dark:border-stone-800 dark:bg-stone-900 ${showActions ? `lg:col-start-2 rtl:lg:[direction:rtl] ${cardRow}` : ""}`}>
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopReceiptGroup}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setOpenReceipt(true); viewer.current?.showModal(); }} className={primary}>{copy.shopViewReceipt}</button>
                    <a href={receipt} className={quiet}>{copy.shopDownloadReceipt}</a>
                </div>
            </section>
            {showActions && (
                <section className={`order-1 h-full rounded-2xl border border-[#E5E7EB] bg-white p-4 lg:order-none lg:col-start-1 rtl:lg:[direction:rtl] dark:border-stone-800 dark:bg-stone-900 ${cardRow}`}>
                    <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopOrderActions}</h2>
                    {confirm ? (
                        <div className={`mt-3 rounded-2xl px-4 py-3 text-sm ${destructiveConfirm ? "bg-red-50 text-red-950" : "bg-amber-50 text-amber-950"}`}>
                            <p>{confirm === "CANCELLED" ? (origin === "counter" ? copy.shopCancelSaleConfirm : copy.shopCancelConfirm) : confirm === "FULFILLED" ? copy.shopCompleteConfirm : copy.shopRejectConfirm}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={pending}
                                    onClick={() => {
                                        if (confirm === "CANCELLED") void run(() => (role === "staff" ? cancelStaffOrder(orderId) : cancelOrder(orderId)), copy.shopCancelDone);
                                        else void run(() => advanceOrder(orderId, confirm), confirm === "FULFILLED" ? copy.shopStatusFulfilled : copy.shopStatusRejected);
                                    }}
                                    className={destructiveConfirm ? dangerSolid : primary}
                                >
                                    {confirm === "CANCELLED" ? copy.shopCancelOrder : label[confirm]}
                                </button>
                                <button type="button" disabled={pending} onClick={() => setConfirm(null)} className={quiet}>{confirm === "CANCELLED" ? copy.shopCancelKeep : copy.shopKeepOrder}</button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {moves.map((move) => (
                                <button key={move.to} type="button" disabled={pending} onClick={() => ask(move.to)} className={move.to === "REJECTED" ? danger : primary}>
                                    {label[move.to]}
                                </button>
                            ))}
                            {(cancelAllowed || staffCancel) && (
                                <button type="button" disabled={pending} onClick={() => setConfirm("CANCELLED")} className={danger}>{copy.shopCancelOrder}</button>
                            )}
                            {cancelClosed && (
                                <div className="w-full">
                                    <button type="button" disabled className={quiet}>{copy.shopCancelOrder}</button>
                                    <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">{copy.shopCancelClosed}</p>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}
            <style>{`@media print { body:has(dialog[open]) > :not(dialog) { display: none !important; } body:has(dialog[open]) dialog[open] { position: absolute !important; inset: 0 !important; width: 100% !important; max-width: none !important; height: auto !important; max-height: none !important; margin: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: white !important; } body:has(dialog[open]) dialog[open] header { display: none !important; } body:has(dialog[open]) dialog[open] iframe { width: 100% !important; min-height: 100vh !important; border: 0 !important; } }`}</style>
            <dialog
                ref={viewer}
                className="m-0 h-dvh w-full max-h-none max-w-none rounded-none border-0 bg-[#f3f4f6] p-0 text-stone-900 shadow-lg backdrop:bg-stone-950/50 sm:m-auto sm:h-[min(90dvh,52rem)] sm:w-[min(64rem,calc(100%-2rem))] sm:rounded-2xl sm:border sm:border-[#E5E7EB] rtl:[direction:rtl] dark:bg-stone-950 dark:text-stone-50 sm:dark:border-stone-700"
                onClose={() => setOpenReceipt(false)}
            >
                <div className="flex h-full flex-col">
                    <header className="flex items-center gap-2 border-b border-[#E5E7EB] bg-white px-4 py-3 print:hidden dark:border-stone-800 dark:bg-stone-950">
                        <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopReceiptTitle}</h3>
                        <a href={receipt} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950">
                            <Download className="size-3.5" strokeWidth={1.75} />
                            {copy.shopDownloadReceipt}
                        </a>
                        <button type="button" onClick={() => viewer.current?.close()} aria-label={copy.medDocsClose} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                            <X className="size-4" strokeWidth={1.75} />
                        </button>
                    </header>
                    {openReceipt && <iframe title={copy.shopReceiptTitle} src={`${receipt}?view=1`} className="min-h-0 w-full flex-1 bg-[#f3f4f6]" />}
                </div>
            </dialog>
        </div>
    );
}
