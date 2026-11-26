import Link from "next/link";
import HistoryBack from "@/components/HistoryBack";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { prisma } from "@/lib/prisma";
import { formatLbp, orderFulfillmentLabel, orderPaymentLabel, orderStatusLabel, orderStatusTone, shortOrderId, shopText } from "@/lib/shop/catalog";
import { sellableName } from "@/lib/shop/variants";
import { formatStored, orderCharge } from "@/lib/shop/money";

export default async function MyOrdersPage() {
    let session;
    try {
        session = await requireRole(["OWNER"]);
    } catch {
        redirect("/login?next=/shop/orders");
    }

    const locale = await getLocale();
    const copy = messages(locale);
    const orders = await prisma.shopOrder.findMany({
        where: { ownerId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: { items: { include: { product: { select: { name: true, nameAr: true } } } } },
    });
    const date = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Beirut" });

    return (
        <main className="bg-[#f6f1e8]">
            <div className="mx-auto w-full max-w-2xl px-5 py-10">
                <HistoryBack fallback="/shop" className="cursor-pointer text-sm font-medium text-emerald-800">{copy.shopBackStore}</HistoryBack>
                <h1 className="mt-3 text-4xl text-emerald-950">{copy.shopOrders}</h1>
                <ul className="mt-8 flex flex-col gap-4">
                    {orders.map((order) => {
                        const total = orderCharge(order.items, order.deliveryFee).total;
                        const statusTone = orderStatusTone(order.status);
                        const details = [
                            [copy.shopReceive, orderFulfillmentLabel(order.fulfillment, copy)],
                            [copy.shopPayment, orderPaymentLabel(order.payment, copy)],
                            order.deliveryAddress ? [copy.shopDeliveryAddress, order.deliveryAddress] : null,
                            order.deliveryPhone ? [copy.shopDeliveryPhone, order.deliveryPhone] : null,
                            order.deliveryNote ? [copy.shopDeliveryNote, order.deliveryNote] : null,
                        ].filter((row): row is [string, string] => row !== null);
                        return (
                            <li key={order.id} className="overflow-hidden rounded-[1.6rem] bg-white ring-1 ring-stone-200">
                                <div className="flex items-center justify-between gap-3 px-5 py-4">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <p className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone}`}>{orderStatusLabel(order.status, copy)}</p>
                                        <p className="truncate text-sm font-medium text-emerald-950">{shortOrderId(order.id)}</p>
                                    </div>
                                    <p className="shrink-0 text-sm text-stone-500">{date.format(order.createdAt)}</p>
                                </div>
                                {order.status === "PENDING" && (
                                    <p className="mx-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">{copy.shopPendingCustomer}</p>
                                )}
                                <ul className="mt-3 border-t border-stone-100 px-5 py-2 text-sm text-stone-700">
                                    {order.items.map((item) => (
                                        <li key={item.id} className="flex justify-between gap-4 py-2">
                                            <span>{sellableName(shopText(locale, item.product.name, item.product.nameAr), shopText(locale, item.variantLabel, item.variantLabelAr))} × {formatLbp(item.quantity, locale)}</span>
                                            <span className="shrink-0">{formatStored(item.unitPrice * item.quantity, order.currency, locale)}</span>
                                        </li>
                                    ))}
                                </ul>
                                <dl className="grid gap-3 border-t border-stone-100 px-5 py-4 text-sm">
                                    {details.map(([label, value]) => (
                                        <div key={label}>
                                            <dt className="text-xs font-medium text-stone-500">{label}</dt>
                                            <dd className="mt-0.5 text-stone-800">{value}</dd>
                                        </div>
                                    ))}
                                </dl>
                                <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50 px-5 py-4 text-sm">
                                    <span className="text-stone-500">{copy.shopTotal}</span>
                                    <span className="flex items-center gap-4">
                                        <span className="font-medium text-emerald-950">{formatStored(total, order.currency, locale)}</span>
                                        <Link href={`/shop/orders/${order.id}`} className="font-medium text-emerald-900 hover:underline">{copy.shopViewOrder}</Link>
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                    {orders.length === 0 && <li className="rounded-[1.6rem] bg-white px-6 py-10 text-center text-stone-600 ring-1 ring-stone-200">{copy.shopNoOrders}</li>}
                </ul>
            </div>
        </main>
    );
}
