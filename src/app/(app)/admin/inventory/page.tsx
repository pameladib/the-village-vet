import Link from "next/link";
import { redirect } from "next/navigation";
import InventoryFilters from "@/components/shop/InventoryFilters";
import StockBadge from "@/components/shop/StockBadge";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages, type Copy } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { prisma } from "@/lib/prisma";
import { shopText } from "@/lib/shop/catalog";
import { openOrderStatuses, stockLevels, stockState, type StockState } from "@/lib/shop/inventory";

function first(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function stateLabel(state: StockState, copy: Copy) {
    if (state === "low") return copy.invLowStock;
    if (state === "out") return copy.invOutStock;
    return copy.invInStock;
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; cat?: string | string[]; status?: string | string[]; sort?: string | string[] }> }) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const raw = await searchParams;
    const query = (first(raw.q) ?? "").trim().slice(0, 80);
    const categoryId = first(raw.cat) ?? "";
    const status = first(raw.status);
    const stateFilter = status === "in" || status === "low" || status === "out" ? status : "";
    const sortKey = first(raw.sort);
    const sort = sortKey === "za" || sortKey === "low" || sortKey === "high" ? sortKey : "name";
    const locale = await getLocale();
    const copy = messages(locale);
    const count = new Intl.NumberFormat(intlLocale(locale));

    const [products, reservedRows, categories] = await Promise.all([
        prisma.product.findMany({
            select: {
                id: true,
                name: true,
                nameAr: true,
                stock: true,
                lowStockAt: true,
                categoryId: true,
                category: { select: { name: true, nameAr: true } },
            },
        }),
        prisma.orderItem.groupBy({
            by: ["productId"],
            where: { order: { status: { in: [...openOrderStatuses] } } },
            _sum: { quantity: true },
        }),
        prisma.productCategory.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true, nameAr: true } }),
    ]);
    const reserved = new Map(reservedRows.map((row) => [row.productId, row._sum.quantity ?? 0]));
    const rows = products.map((product) => {
        const levels = stockLevels(product.stock, reserved.get(product.id) ?? 0);
        return {
            ...product,
            ...levels,
            state: stockState(levels.available, product.lowStockAt),
            label: shopText(locale, product.name, product.nameAr),
            category: shopText(locale, product.category.name, product.category.nameAr),
        };
    });
    const summary = {
        total: rows.length,
        in: rows.filter((row) => row.state === "in").length,
        low: rows.filter((row) => row.state === "low").length,
        out: rows.filter((row) => row.state === "out").length,
    };
    const activeCategory = categories.some((category) => category.id === categoryId) ? categoryId : "";
    const needle = query.toLocaleLowerCase(locale === "ar" ? "ar" : "en");
    const collation = locale === "ar" ? "ar" : "en";
    const visible = rows.filter((row) => {
        if (activeCategory && row.categoryId !== activeCategory) return false;
        if (stateFilter && row.state !== stateFilter) return false;
        if (!needle) return true;
        return row.name.toLocaleLowerCase().includes(needle) || row.nameAr.toLocaleLowerCase().includes(needle);
    });
    visible.sort((a, b) => {
        if (sort === "low" || sort === "high") {
            const difference = sort === "low" ? a.available - b.available : b.available - a.available;
            if (difference !== 0) return difference;
        }
        const byName = a.label.localeCompare(b.label, collation);
        return sort === "za" ? -byName : byName;
    });
    const cards = [
        { status: "" as const, label: copy.invTotal, value: count.format(summary.total), tone: "text-emerald-950 dark:text-emerald-50" },
        { status: "in" as const, label: copy.invCardIn, value: count.format(summary.in), tone: "text-emerald-800 dark:text-emerald-200" },
        { status: "low" as const, label: copy.invCardLow, value: count.format(summary.low), tone: "text-amber-800 dark:text-amber-200" },
        { status: "out" as const, label: copy.invCardOut, value: count.format(summary.out), tone: "text-stone-600 dark:text-stone-300" },
    ];

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.inventory}</h1>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{copy.invLead}</p>
            </div>
            <InventoryFilters
                copy={copy}
                query={{ q: query, cat: activeCategory, status: stateFilter, sort }}
                categories={categories.map((category) => ({ id: category.id, name: shopText(locale, category.name, category.nameAr) }))}
                cards={cards}
            >
            {visible.length === 0 ? (
                <p className="mt-4 text-sm text-stone-500">{copy.invNone}</p>
            ) : (
                <>
                    <ul className="mt-4 flex flex-col gap-2 md:hidden">
                        {visible.map((product) => (
                            <li key={product.id} className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-emerald-950 dark:text-emerald-50">{product.label}</p>
                                        <p className="truncate text-xs text-stone-500">{product.category}</p>
                                    </div>
                                    <StockBadge state={product.state} label={stateLabel(product.state, copy)} />
                                </div>
                                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                    <div className="min-w-0"><dt className="text-xs text-stone-500">{copy.invPhysical}</dt><dd className="font-medium text-stone-900 dark:text-stone-50">{count.format(product.physical)}</dd></div>
                                    <div className="min-w-0"><dt className="text-xs text-stone-500">{copy.invReserved}</dt><dd className="font-medium text-stone-900 dark:text-stone-50">{count.format(product.reserved)}</dd></div>
                                    <div className="min-w-0"><dt className="text-xs text-stone-500">{copy.invAvailable}</dt><dd className="font-medium text-stone-900 dark:text-stone-50">{count.format(product.available)}</dd></div>
                                </dl>
                                <Link href={`/admin/inventory/${product.id}`} className="mt-3 inline-flex rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950">{copy.invManage}</Link>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-4 hidden overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white md:block dark:border-stone-800 dark:bg-stone-900">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[48rem] border-collapse text-start text-sm">
                                <thead className="text-xs font-medium text-stone-500">
                                    <tr>
                                        <th className="px-3 py-2 text-start font-medium">{copy.invProduct}</th>
                                        <th className="px-3 py-2 text-start font-medium">{copy.invColCategory}</th>
                                        <th className="px-3 py-2 text-start font-medium">{copy.invPhysical}</th>
                                        <th className="px-3 py-2 text-start font-medium">{copy.invReserved}</th>
                                        <th className="px-3 py-2 text-start font-medium">{copy.invAvailable}</th>
                                        <th className="px-3 py-2 text-start font-medium">{copy.invColStatus}</th>
                                        <th className="px-3 py-2 text-start font-medium">{copy.invActions}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.map((product) => (
                                        <tr key={product.id} className="border-t border-[#E5E7EB] hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/70">
                                            <td className="px-3 py-2.5 font-medium text-emerald-950 dark:text-emerald-50">{product.label}</td>
                                            <td className="px-3 py-2.5 text-stone-600 dark:text-stone-300">{product.category}</td>
                                            <td className="px-3 py-2.5 text-stone-800 dark:text-stone-100">{count.format(product.physical)}</td>
                                            <td className="px-3 py-2.5 text-stone-800 dark:text-stone-100">{count.format(product.reserved)}</td>
                                            <td className="px-3 py-2.5 text-stone-800 dark:text-stone-100">{count.format(product.available)}</td>
                                            <td className="px-3 py-2.5"><StockBadge state={product.state} label={stateLabel(product.state, copy)} /></td>
                                            <td className="px-3 py-2.5"><Link href={`/admin/inventory/${product.id}`} className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{copy.invManage}</Link></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
            </InventoryFilters>
        </main>
    );
}
