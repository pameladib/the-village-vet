import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderActions } from "@/components/shop/ShopAdmin";
import { requireRole } from "@/lib/auth/session";
import { whatsappHref } from "@/lib/clinic/public";
import { getLocale, messages, type Copy } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { prisma } from "@/lib/prisma";
import { formatLbp, orderFulfillmentLabel, orderPaymentLabel, orderStatusLabel, shopText, shortOrderId } from "@/lib/shop/catalog";

function adminStatusLabel(status: string, copy: Copy) {
    if (status === "PENDING") return copy.shopFilterPending;
    if (status === "REJECTED") return copy.shopFilterCancelled;
    if (status === "FULFILLED") return copy.shopFilterCompleted;
    return orderStatusLabel(status, copy);
}

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const { id } = await params;
    const order = await prisma.shopOrder.findUnique({
        where: { id },
        include: {
            owner: { select: { name: true, phoneNumber: true } },
            items: { include: { product: { select: { name: true, nameAr: true } } } },
        },
    });
    if (!order) notFound();

    const locale = await getLocale();
    const copy = messages(locale);
    const when = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const contact = order.deliveryPhone?.trim() || order.owner.phoneNumber;
    const chat = whatsappHref(contact);
    const delivery = order.fulfillment === "DELIVERY";
    const rank = order.status === "APPROVED" ? 1 : order.status === "PREPARING" ? 2 : order.status === "OUT_FOR_DELIVERY" ? 3 : order.status === "FULFILLED" ? 4 : 0;
    const steps = [
        { label: copy.shopStepPlaced, done: true, time: order.createdAt },
        { label: copy.shopStatusApproved, done: rank >= 1, time: null },
        { label: copy.shopStatusPreparing, done: rank >= 2, time: null },
        ...(delivery ? [{ label: copy.shopStatusOut, done: rank >= 3, time: null }] : []),
        { label: copy.shopFilterCompleted, done: order.status === "FULFILLED", time: order.status === "FULFILLED" ? order.updatedAt : null },
    ];

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Link href="/admin/orders" className="text-sm font-medium text-emerald-800">{copy.shopAdminOrders}</Link>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{shortOrderId(order.id)}</h1>
                <p className={`rounded-full px-3 py-1 text-sm font-medium ${order.status === "PENDING" ? "bg-amber-100 text-amber-950" : "bg-emerald-50 text-emerald-950"}`}>{adminStatusLabel(order.status, copy)}</p>
            </div>
            <p className="mt-1 text-xs text-stone-400">{order.id}</p>
            {order.status === "PENDING" && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">{copy.shopPendingNote}</p>}

            <section className="mt-8">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopColCustomer}</h2>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                        <dt className="text-stone-500">{copy.shopColCustomer}</dt>
                        <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{order.owner.name}</dd>
                    </div>
                    <div>
                        <dt className="text-stone-500">{copy.phone}</dt>
                        <dd className="mt-0.5"><a href={`tel:${order.owner.phoneNumber}`} className="text-emerald-900 hover:underline dark:text-emerald-200">{order.owner.phoneNumber}</a></dd>
                    </div>
                    {chat && (
                        <div>
                            <dt className="text-stone-500">{copy.whatsapp}</dt>
                            <dd className="mt-0.5"><a href={chat} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{contact}</a></dd>
                        </div>
                    )}
                </dl>
            </section>

            <section className="mt-8">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopColItems}</h2>
                <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
                    <li className="hidden grid-cols-4 gap-2 px-4 py-2 text-xs font-medium text-stone-500 sm:grid">
                        <span>{copy.shopColItems}</span>
                        <span>{copy.shopQty}</span>
                        <span>{copy.shopUnitPrice}</span>
                        <span>{copy.shopSubtotal}</span>
                    </li>
                    {order.items.map((item) => (
                        <li key={item.id} className="grid grid-cols-2 gap-2 px-4 py-3 text-sm sm:grid-cols-4">
                            <p className="col-span-2 font-medium text-stone-900 sm:col-span-1 dark:text-stone-50">{shopText(locale, item.product.name, item.product.nameAr)}</p>
                            <p className="text-stone-600 dark:text-stone-300">{formatLbp(item.quantity, locale)}</p>
                            <p className="text-stone-600 dark:text-stone-300">{formatLbp(item.unitPrice, locale)} {copy.lbp}</p>
                            <p className="text-stone-900 dark:text-stone-50">{formatLbp(item.unitPrice * item.quantity, locale)} {copy.lbp}</p>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mt-8">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopTotal}</h2>
                <dl className="mt-3 max-w-sm text-sm">
                    <div className="flex justify-between gap-3 py-1">
                        <dt className="text-stone-500">{copy.shopSubtotal}</dt>
                        <dd>{formatLbp(subtotal, locale)} {copy.lbp}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-stone-200 py-2 font-medium text-emerald-950 dark:text-emerald-50">
                        <dt>{copy.shopTotal}</dt>
                        <dd>{formatLbp(subtotal, locale)} {copy.lbp}</dd>
                    </div>
                </dl>
            </section>

            <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
            <section>
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopColFulfilment}</h2>
                <dl className="mt-3 grid gap-3 text-sm">
                    <div>
                        <dt className="text-stone-500">{copy.shopReceive}</dt>
                        <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{orderFulfillmentLabel(order.fulfillment, copy)}</dd>
                    </div>
                    {order.deliveryAddress && (
                        <div>
                            <dt className="text-stone-500">{copy.shopDeliveryAddress}</dt>
                            <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{order.deliveryAddress}</dd>
                        </div>
                    )}
                    {order.deliveryPhone && (
                        <div>
                            <dt className="text-stone-500">{copy.shopDeliveryPhone}</dt>
                            <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{order.deliveryPhone}</dd>
                        </div>
                    )}
                    {order.deliveryNote && (
                        <div>
                            <dt className="text-stone-500">{copy.shopDeliveryNote}</dt>
                            <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{order.deliveryNote}</dd>
                        </div>
                    )}
                </dl>
            </section>

            <div className="flex flex-col gap-8">
            <section>
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopPayment}</h2>
                <dl className="mt-3 grid gap-3 text-sm">
                    <div>
                        <dt className="text-stone-500">{copy.shopPayment}</dt>
                        <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{orderPaymentLabel(order.payment, order.fulfillment, copy)}</dd>
                    </div>
                    <div>
                        <dt className="text-stone-500">{copy.shopPayStatus}</dt>
                        <dd className="mt-0.5 max-w-md text-stone-700 dark:text-stone-200">{copy.shopPayArranged}</dd>
                    </div>
                </dl>
            </section>

            <section>
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopColStatus}</h2>
                {order.status === "REJECTED" ? (
                    <ol className="mt-3 flex flex-col gap-2 text-sm">
                        <li className="text-stone-800 dark:text-stone-100">{copy.shopStepPlaced} · {when.format(order.createdAt)}</li>
                        <li className="font-medium text-stone-700 dark:text-stone-200">{copy.shopFilterCancelled} · {when.format(order.updatedAt)}</li>
                    </ol>
                ) : (
                    <ol className="mt-3 flex flex-col gap-2 text-sm">
                        {steps.map((step) => (
                            <li key={step.label} className={step.done ? "font-medium text-emerald-950 dark:text-emerald-50" : "text-stone-400"}>
                                {step.label}
                                {step.time ? ` · ${when.format(step.time)}` : ""}
                            </li>
                        ))}
                    </ol>
                )}
            </section>
            </div>

            <div className="lg:col-span-2">
                <OrderActions orderId={order.id} status={order.status} fulfillment={order.fulfillment} copy={copy} />
            </div>
            </div>
        </main>
    );
}
