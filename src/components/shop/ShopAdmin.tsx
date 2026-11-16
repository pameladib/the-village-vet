"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setOrderStatus } from "@/lib/actions/shop";
import type { Copy } from "@/lib/i18n";

export function mapShopError(message: string | undefined, copy: Copy) {
    if (message === "You need a staff account.") return copy.shopErrStaff;
    if (message === "Add a photo.") return copy.shopPhotoRequired;
    if (
        message?.startsWith("A photo")
        || message === "That file is not a valid photo."
        || message === "Could not store the photo."
        || message === "Could not prepare the upload."
        || message === "Could not store the file."
        || message === "File storage is not set up yet."
    ) return copy.shopErrPhotoFile;
    if (message === "This product is on an order, so it can be hidden instead of deleted.") return copy.shopErrOnOrder;
    if (message === "That order can no longer be changed." || message === "That status change is not allowed.") return message === "That status change is not allowed." ? copy.shopErrTransition : copy.shopErrOrder;
    if (message === "Approve the order before fulfilling it.") return copy.shopErrFulfil;
    if (message === "That product was not found." || message === "That order was not found." || message === "That category was not found.") return copy.shopErrMissing;
    if (message === "This category still has products, so it cannot be deleted.") return copy.shopCategoryInUse;
    if (message === "A category with that English name already exists.") return copy.shopCategoryExists;
    return copy.shopErrDetails;
}

export function OrderActions({ orderId, status, fulfillment, copy }: { orderId: string; status: string; fulfillment: string; copy: Copy }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const delivery = fulfillment === "DELIVERY";

    async function update(next: "APPROVED" | "PREPARING" | "OUT_FOR_DELIVERY" | "FULFILLED" | "REJECTED") {
        const result = await setOrderStatus(orderId, next);
        if (!result.success) {
            setError(mapShopError(result.formErrors[0], copy));
            setConfirming(false);
            return;
        }
        setConfirming(false);
        router.refresh();
    }

    if (status === "REJECTED" || status === "FULFILLED") return null;

    const button = "rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950";
    const quiet = "rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50";

    return (
        <div className="flex flex-col items-start gap-3">
            {confirming ? (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <p>{copy.shopRejectConfirm}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => update("REJECTED")} className="rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-950">{copy.shopReject}</button>
                        <button type="button" onClick={() => setConfirming(false)} className={quiet}>{copy.shopKeepOrder}</button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {status === "PENDING" && <button type="button" onClick={() => update("APPROVED")} className={button}>{copy.shopApprove}</button>}
                    {status === "APPROVED" && <button type="button" onClick={() => update("PREPARING")} className={button}>{copy.shopMarkPreparing}</button>}
                    {status === "PREPARING" && delivery && <button type="button" onClick={() => update("OUT_FOR_DELIVERY")} className={button}>{copy.shopMarkOut}</button>}
                    {status === "PREPARING" && !delivery && <button type="button" onClick={() => update("FULFILLED")} className={button}>{copy.shopMarkCompleted}</button>}
                    {status === "OUT_FOR_DELIVERY" && <button type="button" onClick={() => update("FULFILLED")} className={button}>{copy.shopMarkCompleted}</button>}
                    <button type="button" onClick={() => setConfirming(true)} className={quiet}>{copy.shopReject}</button>
                </div>
            )}
            {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
    );
}
