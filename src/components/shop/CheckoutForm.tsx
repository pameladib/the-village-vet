"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { placeOrder } from "@/lib/actions/shop";
import type { Copy, Locale } from "@/lib/i18n";
import { formatLbp } from "@/lib/shop/catalog";
import { clearCart, readCart, type CartLine } from "./CartView";

const field = "mt-1 w-full rounded-2xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-emerald-700";

export default function CheckoutForm({ copy, locale, phone }: { copy: Copy; locale: Locale; phone: string }) {
    const router = useRouter();
    const [lines] = useState<CartLine[]>(() => readCart());
    const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
    const [payment, setPayment] = useState<"CASH" | "WHISH">("CASH");
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

    if (lines.length === 0) {
        return <p className="mt-8 text-stone-600">{copy.shopCartEmpty}</p>;
    }

    const cashLabel = fulfillment === "DELIVERY" ? copy.shopPayCashDelivery : copy.shopPayCashPickup;

    return (
        <form
            className="mt-8 flex flex-col gap-6"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                setPending(true);
                setError(null);
                const result = await placeOrder({
                    items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
                    fulfillment,
                    payment,
                    deliveryAddress: String(form.get("address") ?? ""),
                    deliveryPhone: String(form.get("phone") ?? ""),
                    deliveryNote: String(form.get("note") ?? ""),
                });
                if (!result.success) {
                    setPending(false);
                    const message = result.formErrors[0];
                    if (message === "You need to sign in.") {
                        router.push("/login?next=/shop/checkout");
                        return;
                    }
                    setError(message === "Enter the delivery address." ? copy.shopAddressRequired : message === "Enter a contact number." ? copy.shopPhoneRequired : message === "Choose at least one product." ? copy.shopChooseProduct : copy.shopStockGone);
                    return;
                }
                clearCart();
                router.replace("/shop/orders");
            }}
        >
            <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">{copy.shopCheckout}</legend>
                {(["PICKUP", "DELIVERY"] as const).map((choice) => (
                    <label key={choice} className={`cursor-pointer rounded-3xl border px-4 py-4 text-sm font-medium ${fulfillment === choice ? "border-emerald-800 bg-white text-emerald-950" : "border-stone-200 bg-white/70 text-stone-600"}`}>
                        <input type="radio" name="fulfillment" className="me-2 accent-emerald-800" checked={fulfillment === choice} onChange={() => setFulfillment(choice)} />
                        {choice === "PICKUP" ? copy.shopPickup : copy.shopDelivery}
                    </label>
                ))}
            </fieldset>

            {fulfillment === "DELIVERY" && (
                <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 ring-1 ring-stone-200">
                    <label className="text-sm font-medium text-emerald-950">
                        {copy.shopDeliveryAddress}
                        <textarea name="address" required rows={3} className={field} />
                    </label>
                    <label className="text-sm font-medium text-emerald-950">
                        {copy.shopDeliveryPhone}
                        <input name="phone" type="tel" required defaultValue={phone} className={field} />
                    </label>
                    <label className="text-sm font-medium text-emerald-950">
                        {copy.shopDeliveryNote}
                        <textarea name="note" rows={2} className={field} />
                    </label>
                </div>
            )}

            <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-emerald-950">{copy.shopPayment}</legend>
                <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="radio" name="payment" className="accent-emerald-800" checked={payment === "CASH"} onChange={() => setPayment("CASH")} />
                    {cashLabel}
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="payment" className="accent-emerald-800" checked={payment === "WHISH"} onChange={() => setPayment("WHISH")} />
                    {copy.shopPayWhish}
                </label>
            </fieldset>

            <div className="rounded-3xl bg-emerald-950 px-5 py-5 text-white">
                <div className="flex items-center justify-between text-sm">
                    <span>{copy.shopTotal}</span>
                    <span className="text-lg font-medium">{formatLbp(total, locale)} {copy.lbp}</span>
                </div>
                {error && <p className="mt-3 text-sm text-amber-100">{error}</p>}
                <button type="submit" disabled={pending} className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-emerald-950 transition duration-200 hover:scale-[1.02] hover:bg-emerald-50 hover:shadow-md disabled:opacity-60">
                    {pending ? copy.shopPlacing : copy.shopPlace}
                </button>
            </div>
        </form>
    );
}
