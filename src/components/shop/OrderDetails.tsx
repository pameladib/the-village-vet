import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import HistoryBack from "@/components/HistoryBack";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { ownerChat, whatsappHref } from "@/lib/clinic/public";
import { formatLbp, orderFulfillmentLabel, orderPaymentLabel, orderStatusLabel, orderStatusTone, shortOrderId } from "@/lib/shop/catalog";
import { formatStored, orderCharge } from "@/lib/shop/money";
import { isDelivery, orderOrigin, progressStages, showsProgress, staffCanCancel, stageState, type ProgressStage } from "@/lib/shop/lifecycle";
import OrderControls from "./OrderControls";
import OrderPayment from "./OrderPayment";

export type OrderDetailModel = {
    id: string;
    status: string;
    fulfillment: string;
    payment: string;
    currency: string;
    createdAt: Date;
    approvedAt: Date | null;
    outForDeliveryAt: Date | null;
    readyForPickupAt: Date | null;
    completedAt: Date | null;
    rejectedAt: Date | null;
    cancelledAt: Date | null;
    paidAt: Date | null;
    createdById: string | null;
    deliveryAddress: string | null;
    deliveryPhone: string | null;
    deliveryNote: string | null;
    deliveryFee: number;
    ownerId?: string | null;
    ownerName: string;
    ownerPhone: string;
    items: { id: string; name: string; quantity: number; unitPrice: number }[];
    clinicAddress: string | null;
    clinicPhone: string | null;
    clinicWhatsapp: string | null;
    clinicEmail: string | null;
};

const stageLabel: Record<ProgressStage, "shopFilterPending" | "shopStatusApproved" | "shopStatusOut" | "shopStatusReady" | "shopFilterCompleted"> = {
    PENDING: "shopFilterPending",
    APPROVED: "shopStatusApproved",
    OUT_FOR_DELIVERY: "shopStatusOut",
    READY_FOR_PICKUP: "shopStatusReady",
    FULFILLED: "shopFilterCompleted",
};

function phoneKey(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.startsWith("00")) return digits.slice(2);
    if (digits.startsWith("0")) return `961${digits.slice(1)}`;
    return digits;
}

function stageTime(stage: ProgressStage, order: OrderDetailModel) {
    if (stage === "PENDING") return order.createdAt;
    if (stage === "APPROVED") return order.approvedAt;
    if (stage === "OUT_FOR_DELIVERY") return order.outForDeliveryAt;
    if (stage === "READY_FOR_PICKUP") return order.readyForPickupAt;
    return order.completedAt;
}

export default function OrderDetails({
    order,
    role,
    backHref,
    backLabel,
    copy,
    locale,
}: {
    order: OrderDetailModel;
    role: "staff" | "customer";
    backHref: string;
    backLabel: string;
    copy: Copy;
    locale: Locale;
}) {
    const when = new Intl.DateTimeFormat(intlLocale(locale), {
        timeZone: "Asia/Beirut",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    const charge = orderCharge(order.items, order.deliveryFee);
    const delivery = isDelivery(order.fulfillment);
    const staff = role === "staff";
    const customerChat = order.ownerPhone ? ownerChat(order.ownerPhone) : null;
    const clinicChat = whatsappHref(order.clinicWhatsapp || order.clinicPhone || "");
    const deliveryPhone = order.deliveryPhone?.trim() ?? "";
    const showDeliveryPhone = delivery && deliveryPhone.length > 0 && phoneKey(deliveryPhone) !== phoneKey(order.ownerPhone);
    const origin = orderOrigin(order);
    const staffCreated = origin !== "customer";
    const noteTime = order.status === "CANCELLED" ? order.cancelledAt : order.status === "REJECTED" ? order.rejectedAt : order.completedAt;
    const steps = progressStages(order.fulfillment, staffCreated);

    return (
        <div className={staff ? "w-full min-w-0" : "mx-auto w-full min-w-0 max-w-3xl"}>
            <HistoryBack fallback={backHref} className={staff ? "inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-emerald-900 hover:underline dark:text-emerald-200" : "cursor-pointer text-sm font-medium text-emerald-800 hover:underline dark:text-emerald-200"}>
                {staff && <ChevronLeft className="size-4 rtl:rotate-180" />}
                {backLabel}
            </HistoryBack>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.shopOrderWord} <span dir="ltr">#{shortOrderId(order.id)}</span></h1>
                    <p className="mt-1 text-sm text-stone-500">{when.format(order.createdAt)}</p>
                </div>
                <p className={`rounded-full px-3 py-1 text-sm font-medium ${orderStatusTone(order.status)}`}>{orderStatusLabel(order.status, copy)}</p>
            </div>

            <section className="mt-6 rounded-2xl border border-[#E5E7EB] bg-white p-4 pb-3 dark:border-stone-800 dark:bg-stone-900">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopProgress}</h2>
                {showsProgress(order.status, origin) ? (
                    <>
                        <ol className="mt-4 flex flex-col md:hidden">
                            {steps.map((stage, index) => {
                                const state = stageState(order.status, stage, order.fulfillment, staffCreated);
                                const time = state === "upcoming" ? null : stageTime(stage, order);
                                const mark = state === "upcoming" ? "bg-stone-300" : "bg-emerald-800";
                                const line = state === "complete" ? "bg-emerald-800" : "bg-stone-200 dark:bg-stone-700";
                                return (
                                    <li key={stage} className="relative flex gap-3 pb-5 last:pb-0">
                                        {index < steps.length - 1 && <span className={`absolute start-[5px] top-3 bottom-0 w-px ${line}`} />}
                                        <span className={`relative z-10 mt-1 size-3 shrink-0 rounded-full ${mark}`} />
                                        <div className="min-w-0">
                                            <p className={state === "upcoming" ? "text-sm text-stone-400" : "text-sm font-medium text-emerald-950 dark:text-emerald-50"}>{copy[stageLabel[stage]]}</p>
                                            {time && <p className="text-xs text-stone-500">{when.format(time)}</p>}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                        <div className="relative mt-5 hidden min-h-[4.5rem] md:block">
                            {steps.slice(0, -1).map((stage, index) => {
                                const state = stageState(order.status, stage, order.fulfillment, staffCreated);
                                const span = 100 / (steps.length - 1);
                                return (
                                    <span
                                        key={stage}
                                        className={`absolute top-[5px] h-px ${state === "complete" ? "bg-emerald-800" : "bg-stone-200 dark:bg-stone-700"}`}
                                        style={{ insetInlineStart: `calc(${index * span}% + 0.375rem)`, width: `calc(${span}% - 0.75rem)` }}
                                    />
                                );
                            })}
                            <ol className="relative">
                                {steps.map((stage, index) => {
                                    const state = stageState(order.status, stage, order.fulfillment, staffCreated);
                                    const time = state === "upcoming" ? null : stageTime(stage, order);
                                    const last = index === steps.length - 1;
                                    const shift = index === 0 ? "" : last ? "-translate-x-full rtl:translate-x-full" : "-translate-x-1/2 rtl:translate-x-1/2";
                                    const align = index === 0 ? "items-start text-start" : last ? "items-end text-end" : "items-center text-center";
                                    return (
                                        <li
                                            key={stage}
                                            className={`absolute top-0 flex w-36 flex-col ${align} ${shift}`}
                                            style={{ insetInlineStart: `${(index / (steps.length - 1)) * 100}%` }}
                                        >
                                            <span className={`relative z-10 size-3 rounded-full ${state === "upcoming" ? "bg-stone-300" : "bg-emerald-800"}`} />
                                            <p className={`mt-2 text-sm ${state === "upcoming" ? "text-stone-400" : "font-medium text-emerald-950 dark:text-emerald-50"}`}>{copy[stageLabel[stage]]}</p>
                                            {time && <p className="text-xs text-stone-500">{when.format(time)}</p>}
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    </>
                ) : (
                    <p className="mt-3 text-sm leading-6 text-stone-700 dark:text-stone-200">
                        {order.status === "CANCELLED" ? copy.shopCancelledNote : order.status === "REJECTED" ? copy.shopRejectedNote : copy.shopStatusFulfilled}
                        {noteTime ? ` · ${when.format(noteTime)}` : ""}
                    </p>
                )}
            </section>

            <section className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white dark:border-stone-800 dark:bg-stone-900">
                <h2 className="px-4 pt-4 text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopColItems}</h2>
                <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[36rem] border-collapse text-start text-sm">
                        <thead className="text-xs font-medium text-stone-500">
                            <tr>
                                <th className="px-4 py-2 text-start font-medium">{copy.shopColItems}</th>
                                <th className="px-3 py-2 text-start font-medium">{copy.shopQty}</th>
                                <th className="px-3 py-2 text-start font-medium">{copy.shopUnitPrice}</th>
                                <th className="px-4 py-2 text-start font-medium">{copy.shopSubtotal}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item) => (
                                <tr key={item.id} className="border-t border-[#E5E7EB] dark:border-stone-800">
                                    <td className="px-4 py-2.5 font-medium text-stone-900 dark:text-stone-50">{item.name}</td>
                                    <td className="px-3 py-2.5 text-stone-700 dark:text-stone-200">{formatLbp(item.quantity, locale)}</td>
                                    <td className="px-3 py-2.5 text-stone-700 dark:text-stone-200">{formatStored(item.unitPrice, order.currency, locale)}</td>
                                    <td className="px-4 py-2.5 text-stone-900 dark:text-stone-50">{formatStored(item.unitPrice * item.quantity, order.currency, locale)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <dl className="border-t border-[#E5E7EB] px-4 py-3 text-sm dark:border-stone-800">
                    <div className="flex justify-between gap-3 py-1">
                        <dt className="text-stone-500">{copy.shopSubtotal}</dt>
                        <dd>{formatStored(charge.subtotal, order.currency, locale)}</dd>
                    </div>
                    {delivery && (
                        <div className="flex justify-between gap-3 py-1">
                            <dt className="text-stone-500">{copy.shopDeliveryFee}</dt>
                            <dd>{formatStored(charge.deliveryFee, order.currency, locale)}</dd>
                        </div>
                    )}
                    <div className="flex justify-between gap-3 py-1 font-medium text-emerald-950 dark:text-emerald-50">
                        <dt>{copy.shopTotal}</dt>
                        <dd>{formatStored(charge.total, order.currency, locale)}</dd>
                    </div>
                </dl>
            </section>

            <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-3">
                <section className="flex h-full flex-col rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                    <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopColCustomer}</h2>
                    <dl className="mt-3 grid gap-3 text-sm">
                        <div>
                            <dt className="sr-only">{copy.shopColCustomer}</dt>
                            <dd className="font-medium text-stone-900 dark:text-stone-50">
                                {staff && order.ownerId ? (
                                    <Link href={`/admin/owners/${order.ownerId}`} className="text-emerald-900 hover:underline dark:text-emerald-200">{order.ownerName}</Link>
                                ) : order.ownerName}
                            </dd>
                        </div>
                        {order.ownerPhone && (
                            <div>
                                <dt className="text-stone-500">{copy.phone}</dt>
                                <dd className="mt-0.5">
                                    {staff && customerChat ? (
                                        <a href={customerChat} target="_blank" rel="noopener noreferrer" className="text-emerald-900 hover:underline dark:text-emerald-200">{order.ownerPhone}</a>
                                    ) : (
                                        <a href={`tel:${order.ownerPhone}`} className="text-emerald-900 hover:underline dark:text-emerald-200">{order.ownerPhone}</a>
                                    )}
                                </dd>
                            </div>
                        )}
                        {!staff && clinicChat && (
                            <div>
                                <dt className="text-stone-500">{copy.whatsapp}</dt>
                                <dd className="mt-0.5"><a href={clinicChat} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{order.clinicWhatsapp || order.clinicPhone}</a></dd>
                            </div>
                        )}
                    </dl>
                </section>
                <section className="flex h-full flex-col rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                    <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{staff ? copy.shopFulfilmentDetails : copy.shopColFulfilment}</h2>
                    <dl className="mt-3 grid gap-3 text-sm">
                        <div>
                            <dt className="text-stone-500">{staff ? copy.shopFulfilmentMethod : copy.shopReceive}</dt>
                            <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{staff && !delivery ? copy.shopClinicPickup : orderFulfillmentLabel(order.fulfillment, copy)}</dd>
                        </div>
                        {delivery ? (
                            <>
                                {order.deliveryAddress && (
                                    <div>
                                        <dt className="text-stone-500">{copy.shopDeliveryAddress}</dt>
                                        <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{order.deliveryAddress}</dd>
                                    </div>
                                )}
                                {showDeliveryPhone && (
                                    <div>
                                        <dt className="text-stone-500">{copy.shopDeliveryPhone}</dt>
                                        <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{deliveryPhone}</dd>
                                    </div>
                                )}
                                {order.deliveryNote && (
                                    <div>
                                        <dt className="text-stone-500">{copy.shopDeliveryNote}</dt>
                                        <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{order.deliveryNote}</dd>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div>
                                <dt className="text-stone-500">{staff ? copy.shopPickupLocation : copy.shopPickupPlace}</dt>
                                <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{staff ? copy.shopPickupLocationValue : order.clinicAddress || copy.shopPickupAtClinic}</dd>
                            </div>
                        )}
                    </dl>
                </section>
                <section className="flex h-full flex-col rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                    <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopPayment}</h2>
                    <dl className="mt-3 grid gap-3 text-sm">
                        <div>
                            <dt className="text-stone-500">{copy.shopPayment}</dt>
                            <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{orderPaymentLabel(order.payment, copy)}</dd>
                        </div>
                        <div className="flex w-full flex-wrap items-center justify-between gap-3">
                            <div>
                                <dt className="text-stone-500">{copy.shopPayStatus}</dt>
                                <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{order.paidAt ? copy.shopPayPaid : copy.shopPayUnpaid}</dd>
                            </div>
                            {staff && <OrderPayment orderId={order.id} paid={order.paidAt != null} copy={copy} />}
                        </div>
                        {order.paidAt && (
                            <div>
                                <dt className="text-stone-500">{copy.shopPaidAt}</dt>
                                <dd className="mt-0.5 text-stone-900 dark:text-stone-50">{when.format(order.paidAt)}</dd>
                            </div>
                        )}
                    </dl>
                    {!staff && !order.paidAt && <p className="mt-3 text-sm leading-6 text-stone-500">{copy.shopPayArranged}</p>}
                </section>
            </div>

            <div className="mt-4">
                <OrderControls
                    orderId={order.id}
                    status={order.status}
                    fulfillment={order.fulfillment}
                    role={role}
                    copy={copy}
                    origin={origin}
                    staffCancel={role === "staff" && staffCanCancel(order)}
                />
            </div>
        </div>
    );
}
