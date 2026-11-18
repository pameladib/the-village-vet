import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import StockBadge from "@/components/shop/StockBadge";
import StockDesk from "@/components/shop/StockDesk";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages, type Copy } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { prisma } from "@/lib/prisma";
import { shopText, shortOrderId } from "@/lib/shop/catalog";
import { openOrderStatuses, stockLevels, stockState } from "@/lib/shop/inventory";

function moveLabel(type: string, copy: Copy) {
    if (type === "RECEIVE") return copy.invMoveReceive;
    if (type === "DAMAGE") return copy.invMoveDamage;
    if (type === "CORRECT") return copy.invMoveCorrect;
    if (type === "RESERVE") return copy.invMoveReserve;
    if (type === "RETURN") return copy.invMoveReturn;
    if (type === "FULFILL") return copy.invMoveFulfill;
    return type;
}

export default async function InventoryProductPage({ params }: { params: Promise<{ id: string }> }) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const { id } = await params;
    const locale = await getLocale();
    const copy = messages(locale);
    const count = new Intl.NumberFormat(intlLocale(locale), { signDisplay: "exceptZero" });
    const plain = new Intl.NumberFormat(intlLocale(locale));
    const when = new Intl.DateTimeFormat(intlLocale(locale), {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Beirut",
    });

    const product = await prisma.product.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            nameAr: true,
            stock: true,
            lowStockAt: true,
            category: { select: { name: true, nameAr: true } },
        },
    });
    if (!product) notFound();

    const [reserved, movements, orderItems] = await Promise.all([
        prisma.orderItem.aggregate({
            where: { productId: id, order: { status: { in: [...openOrderStatuses] } } },
            _sum: { quantity: true },
        }),
        prisma.stockMovement.findMany({
            where: { productId: id },
            orderBy: { createdAt: "desc" },
            include: { staff: { select: { name: true } } },
        }),
        prisma.orderItem.findMany({
            where: { productId: id },
            select: { id: true, quantity: true, order: { select: { id: true, status: true, createdAt: true, updatedAt: true } } },
        }),
    ]);
    const levels = stockLevels(product.stock, reserved._sum.quantity ?? 0);
    const state = stockState(levels.available, product.lowStockAt);
    const history = [
        ...movements.map((movement) => ({
            id: movement.id,
            at: movement.createdAt,
            type: movement.type,
            delta: movement.delta,
            note: movement.note,
            staff: movement.staff.name,
            orderId: null as string | null,
        })),
        ...orderItems.flatMap((item) => {
            const reservedRow = {
                id: `${item.id}-reserve`,
                at: item.order.createdAt,
                type: "RESERVE",
                delta: -item.quantity,
                note: null,
                staff: null,
                orderId: item.order.id,
            };
            if (item.order.status === "REJECTED" || item.order.status === "CANCELLED") {
                return [reservedRow, {
                    id: `${item.id}-return`,
                    at: item.order.updatedAt,
                    type: "RETURN",
                    delta: item.quantity,
                    note: null,
                    staff: null,
                    orderId: item.order.id,
                }];
            }
            if (item.order.status === "FULFILLED") {
                return [reservedRow, {
                    id: `${item.id}-fulfill`,
                    at: item.order.updatedAt,
                    type: "FULFILL",
                    delta: -item.quantity,
                    note: null,
                    staff: null,
                    orderId: item.order.id,
                }];
            }
            return [reservedRow];
        }),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());
    const facts = [
        { label: copy.invPhysical, value: levels.physical },
        { label: copy.invReserved, value: levels.reserved },
        { label: copy.invAvailable, value: levels.available },
        { label: copy.invThreshold, value: product.lowStockAt },
    ];

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <Link href="/admin/inventory" className="text-sm font-medium text-emerald-800 hover:underline dark:text-emerald-200">{copy.inventory}</Link>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{shopText(locale, product.name, product.nameAr)}</h1>
                <StockBadge state={state} label={state === "low" ? copy.invLowStock : state === "out" ? copy.invOutStock : copy.invInStock} />
            </div>
            <p className="mt-1 text-sm text-stone-500">{shopText(locale, product.category.name, product.category.nameAr)}</p>

            <section className="mt-4">
                <h2 className="text-sm font-medium text-emerald-950 dark:text-emerald-50">{copy.invOverview}</h2>
                <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {facts.map((fact) => (
                        <div key={fact.label} className="rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2.5 dark:border-stone-800 dark:bg-stone-900">
                            <p className="text-xs text-stone-500">{fact.label}</p>
                            <p className="mt-1 text-xl font-semibold text-emerald-950 dark:text-emerald-50">{plain.format(fact.value)}</p>
                        </div>
                    ))}
                </div>
            </section>

            <StockDesk productId={product.id} threshold={product.lowStockAt} copy={copy} />

            <section className="mt-6">
                <h2 className="text-sm font-medium text-emerald-950 dark:text-emerald-50">{copy.invHistory}</h2>
                {history.length === 0 ? (
                    <p className="mt-2 text-sm text-stone-500">{copy.invNoHistory}</p>
                ) : (
                    <>
                        <ul className="mt-2 flex flex-col gap-2 md:hidden">
                            {history.map((row) => (
                                <li key={row.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-3 text-sm dark:border-stone-800 dark:bg-stone-900">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="font-medium text-stone-900 dark:text-stone-50">{moveLabel(row.type, copy)}</p>
                                        <p className={row.delta < 0 ? "font-medium text-amber-900" : "font-medium text-emerald-800"}>{count.format(row.delta)}</p>
                                    </div>
                                    <p className="mt-1 text-xs text-stone-500">{when.format(row.at)}</p>
                                    {row.note && <p className="mt-1 text-stone-700 dark:text-stone-200">{row.note}</p>}
                                    <p className="mt-1 text-xs text-stone-500">{row.staff ?? "—"}</p>
                                    {row.orderId && <Link href={`/admin/orders/${row.orderId}`} className="mt-1 inline-flex text-sm font-medium text-emerald-900 hover:underline dark:text-emerald-200">{shortOrderId(row.orderId)}</Link>}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-2 hidden overflow-x-auto md:block">
                            <table className="w-full min-w-[48rem] text-start text-sm">
                                <thead className="text-xs font-medium text-stone-500">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">{copy.invWhen}</th>
                                        <th className="px-3 py-2 font-medium">{copy.invMoveType}</th>
                                        <th className="px-3 py-2 font-medium">{copy.invQtyChanged}</th>
                                        <th className="px-3 py-2 font-medium">{copy.invNote}</th>
                                        <th className="px-3 py-2 font-medium">{copy.invStaff}</th>
                                        <th className="px-3 py-2 font-medium">{copy.invOrder}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((row) => (
                                        <tr key={row.id} className="border-t border-[#E5E7EB] bg-white dark:border-stone-800 dark:bg-stone-900">
                                            <td className="px-3 py-2.5 whitespace-nowrap text-stone-700 dark:text-stone-200">{when.format(row.at)}</td>
                                            <td className="px-3 py-2.5 text-stone-900 dark:text-stone-50">{moveLabel(row.type, copy)}</td>
                                            <td className={`px-3 py-2.5 font-medium ${row.delta < 0 ? "text-amber-900" : "text-emerald-800"}`}>{count.format(row.delta)}</td>
                                            <td className="px-3 py-2.5 text-stone-600 dark:text-stone-300">{row.note ?? "—"}</td>
                                            <td className="px-3 py-2.5 text-stone-700 dark:text-stone-200">{row.staff ?? "—"}</td>
                                            <td className="px-3 py-2.5">{row.orderId ? <Link href={`/admin/orders/${row.orderId}`} className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{shortOrderId(row.orderId)}</Link> : "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}
