import Link from "next/link";
import { redirect } from "next/navigation";
import OrderSort from "@/components/shop/OrderSort";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { ownerChat } from "@/lib/clinic/phone";
import { prisma } from "@/lib/prisma";
import { orderFulfillmentLabel, orderPaymentLabel, orderStatusLabel, orderStatusTone, shortOrderId } from "@/lib/shop/catalog";
import { formatStored, orderCharge } from "@/lib/shop/money";
import { orderContact, orderOrigin } from "@/lib/shop/lifecycle";

const statusFilters = {
    pending: ["PENDING"],
    approved: ["APPROVED", "PREPARING"],
    ready: ["READY_FOR_PICKUP"],
    out: ["OUT_FOR_DELIVERY"],
    completed: ["FULFILLED"],
    rejected: ["REJECTED"],
    cancelled: ["CANCELLED"],
} as const;

const activeStatuses = ["PENDING", "APPROVED", "PREPARING", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP"] as const;

type FilterKey = keyof typeof statusFilters;

function first(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function ordersHref(status: string, query: string, sort: string, owner: string) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (query) params.set("q", query);
    if (sort === "new") params.set("sort", "new");
    if (owner) params.set("owner", owner);
    const search = params.toString();
    return search ? `/admin/orders?${search}` : "/admin/orders";
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string | string[]; q?: string | string[]; sort?: string | string[]; owner?: string | string[] }> }) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const raw = await searchParams;
    const statusKey = first(raw.status);
    const filter = statusKey && statusKey in statusFilters ? statusKey as FilterKey : "";
    const status = filter ? statusFilters[filter] : undefined;
    const query = (first(raw.q) ?? "").trim().slice(0, 80);
    const sort = first(raw.sort) === "new" ? "new" : "old";
    const requestedOwner = (first(raw.owner) ?? "").trim();
    const customer = /^[A-Za-z0-9]{8,64}$/.test(requestedOwner)
        ? await prisma.user.findFirst({ where: { id: requestedOwner, role: "OWNER" }, select: { id: true, name: true } })
        : null;
    const ownerId = customer?.id ?? "";
    const showAll = Boolean(ownerId) && statusKey === "all";
    const locale = await getLocale();
    const copy = messages(locale);
    const count = new Intl.NumberFormat(intlLocale(locale));
    const where = {
        ...(ownerId ? { ownerId } : {}),
        ...(!showAll ? { status: { in: status ? [...status] : [...activeStatuses] } } : {}),
        ...(query
            ? {
                OR: [
                    { id: { contains: query, mode: "insensitive" as const } },
                    { customerName: { contains: query, mode: "insensitive" as const } },
                    { customerPhone: { contains: query } },
                    { owner: { name: { contains: query, mode: "insensitive" as const } } },
                    { owner: { phoneNumber: { contains: query } } },
                    { deliveryPhone: { contains: query } },
                ],
            }
            : {}),
    };

    const [orders, grouped] = await Promise.all([
        prisma.shopOrder.findMany({
            where,
            orderBy: { createdAt: sort === "new" ? "desc" : "asc" },
            take: 200,
            include: {
                owner: { select: { name: true, phoneNumber: true } },
                items: { select: { quantity: true, unitPrice: true } },
            },
        }),
        prisma.shopOrder.groupBy({ by: ["status"], where: ownerId ? { ownerId } : undefined, _count: { _all: true } }),
    ]);
    const totals = Object.fromEntries(grouped.map((row) => [row.status, row._count._all])) as Record<string, number>;
    const activeCount = activeStatuses.reduce((sum, key) => sum + (totals[key] ?? 0), 0);
    const allCount = Object.values(totals).reduce((sum, value) => sum + value, 0);
    const tabs = [
        ...(ownerId ? [{ key: "all", label: copy.ownerOrdersAll, value: allCount }] : []),
        { key: "", label: copy.shopFilterAll, value: activeCount },
        { key: "pending", label: copy.shopFilterPending, value: totals.PENDING ?? 0 },
        { key: "approved", label: copy.shopStatusApproved, value: (totals.APPROVED ?? 0) + (totals.PREPARING ?? 0) },
        { key: "ready", label: copy.shopFilterReady, value: totals.READY_FOR_PICKUP ?? 0 },
        { key: "out", label: copy.shopFilterOut, value: totals.OUT_FOR_DELIVERY ?? 0 },
        { key: "completed", label: copy.shopFilterCompleted, value: totals.FULFILLED ?? 0 },
        { key: "rejected", label: copy.shopFilterRejected, value: totals.REJECTED ?? 0 },
        { key: "cancelled", label: copy.shopFilterCancelled, value: totals.CANCELLED ?? 0 },
    ];

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.shopAdminOrders}</h1>
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{copy.shopOrdersLead}</p>
                </div>
                <Link href="/admin/orders/new" className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-950">{copy.shopNewOrder}</Link>
            </div>
            {customer && (
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                    {copy.ownerOrdersFor}{" "}
                    <Link href={`/admin/owners/${customer.id}`} className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{customer.name}</Link>
                </p>
            )}
            <form className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center" action="/admin/orders">
                {(filter || showAll) && <input type="hidden" name="status" value={showAll ? "all" : filter} />}
                {sort === "new" && <input type="hidden" name="sort" value="new" />}
                {ownerId && <input type="hidden" name="owner" value={ownerId} />}
                <input
                    name="q"
                    defaultValue={query}
                    placeholder={copy.shopOrderSearch}
                    className="w-full rounded-full border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                />
                <OrderSort label={copy.sortBy} oldest={copy.sortOldest} newest={copy.sortNewest} status={showAll ? "all" : filter} query={query} sort={sort} owner={ownerId} />
                <button className="rounded-full bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-950">{copy.search}</button>
            </form>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {tabs.map((tab) => {
                    const current = showAll ? tab.key === "all" : tab.key === filter;
                    const pending = tab.key === "pending" && tab.value > 0;
                    return (
                        <Link
                            key={tab.label}
                            href={ordersHref(tab.key, query, sort, ownerId)}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
                                current
                                    ? pending ? "bg-amber-800 text-white" : "bg-emerald-900 text-white"
                                    : pending ? "bg-amber-100 text-amber-950 hover:bg-amber-200" : "bg-white text-stone-700 hover:bg-emerald-50 dark:bg-stone-900 dark:text-stone-200"
                            }`}
                        >
                            {tab.label}
                            <span className={current ? "text-white/80" : "text-stone-500"}>{count.format(tab.value)}</span>
                        </Link>
                    );
                })}
            </div>

            {orders.length === 0 ? (
                <p className="mt-6 text-sm text-stone-500">{copy.shopNoOrders}</p>
            ) : (
                <>
                    <ul className="mt-4 flex flex-col gap-2 md:hidden">
                        {orders.map((order) => {
                            const total = orderCharge(order.items, order.deliveryFee).total;
                            const items = order.items.reduce((sum, item) => sum + item.quantity, 0);
                            const contact = orderContact(order, copy.shopWalkIn);
                            const origin = orderOrigin(order);
                            const originLabel = origin === "counter" ? copy.shopOriginCounter : origin === "staff" ? copy.shopOriginStaff : copy.shopOriginCustomer;
                            const chat = contact.phone ? ownerChat(contact.phone) : null;
                            return (
                                <li key={order.id} className={`relative rounded-2xl bg-white px-4 py-3 dark:bg-stone-900 ${order.status === "PENDING" ? "ring-1 ring-amber-300" : ""}`}>
                                    <Link href={`/admin/orders/${order.id}`} aria-label={shortOrderId(order.id)} className="absolute inset-0 rounded-2xl" />
                                    <div className="pointer-events-none relative">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="font-medium text-emerald-950 dark:text-emerald-50">{shortOrderId(order.id)}</p>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusTone(order.status)}`}>{orderStatusLabel(order.status, copy)}</span>
                                        </div>
                                        <p className="mt-1 text-sm text-stone-800 dark:text-stone-100">
                                            {order.ownerId ? (
                                                <Link href={`/admin/owners/${order.ownerId}`} className="pointer-events-auto relative z-10 font-medium text-emerald-900 hover:underline dark:text-emerald-200">{contact.name}</Link>
                                            ) : contact.name}
                                        </p>
                                        <p className="text-xs text-stone-500">
                                            {chat ? <a href={chat} target="_blank" rel="noopener noreferrer" className="pointer-events-auto relative z-10 hover:underline">{contact.phone}</a> : contact.phone}
                                            {contact.phone ? " · " : ""}
                                            {originLabel}
                                        </p>
                                        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                                            {count.format(items)} {copy.shopOrderItems}
                                            {" · "}
                                            {formatStored(total, order.currency, locale)}
                                            {" · "}
                                            {orderFulfillmentLabel(order.fulfillment, copy)}
                                            {" · "}
                                            {orderPaymentLabel(order.payment, copy)}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="mt-4 hidden overflow-x-auto md:block">
                        <table className="w-full text-start text-sm">
                            <thead className="text-xs font-medium text-stone-500">
                                <tr>
                                    <th className="px-3 py-2 font-medium">{copy.shopColOrder}</th>
                                    <th className="px-3 py-2 font-medium">{copy.shopColCustomer}</th>
                                    <th className="px-3 py-2 font-medium">{copy.shopColItems}</th>
                                    <th className="px-3 py-2 font-medium">{copy.shopTotal}</th>
                                    <th className="px-3 py-2 font-medium">{copy.shopColFulfilment}</th>
                                    <th className="px-3 py-2 font-medium">{copy.shopPayment}</th>
                                    <th className="px-3 py-2 font-medium">{copy.shopColStatus}</th>
                                    <th className="px-3 py-2 font-medium">{copy.shopColActions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => {
                                    const total = orderCharge(order.items, order.deliveryFee).total;
                                    const items = order.items.reduce((sum, item) => sum + item.quantity, 0);
                                    const contact = orderContact(order, copy.shopWalkIn);
                                    const origin = orderOrigin(order);
                                    const originLabel = origin === "counter" ? copy.shopOriginCounter : origin === "staff" ? copy.shopOriginStaff : copy.shopOriginCustomer;
                                    const chat = contact.phone ? ownerChat(contact.phone) : null;
                                    return (
                                        <tr key={order.id} className={order.status === "PENDING" ? "bg-amber-50/80 dark:bg-amber-950/20" : "bg-white dark:bg-stone-900"}>
                                            <td className="rounded-s-xl px-3 py-3 font-medium text-emerald-950 dark:text-emerald-50">{shortOrderId(order.id)}</td>
                                            <td className="px-3 py-3">
                                                <p className="text-stone-900 dark:text-stone-50">
                                                    {order.ownerId ? (
                                                        <Link href={`/admin/owners/${order.ownerId}`} className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{contact.name}</Link>
                                                    ) : contact.name}
                                                </p>
                                                <p className="text-xs text-stone-500">
                                                    {chat ? <a href={chat} target="_blank" rel="noopener noreferrer" className="hover:underline">{contact.phone}</a> : contact.phone}
                                                    {contact.phone ? " · " : ""}
                                                    {originLabel}
                                                </p>
                                            </td>
                                            <td className="px-3 py-3 text-stone-700 dark:text-stone-200">{count.format(items)} {copy.shopOrderItems}</td>
                                            <td className="px-3 py-3 text-stone-700 dark:text-stone-200">{formatStored(total, order.currency, locale)}</td>
                                            <td className="px-3 py-3 text-stone-700 dark:text-stone-200">{orderFulfillmentLabel(order.fulfillment, copy)}</td>
                                            <td className="px-3 py-3 text-stone-700 dark:text-stone-200">{orderPaymentLabel(order.payment, copy)}</td>
                                            <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusTone(order.status)}`}>{orderStatusLabel(order.status, copy)}</span></td>
                                            <td className="rounded-e-xl px-3 py-3"><Link href={`/admin/orders/${order.id}`} className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{copy.viewAppointment}</Link></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </main>
    );
}
