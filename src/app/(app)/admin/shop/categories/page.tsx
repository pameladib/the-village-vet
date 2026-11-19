import Link from "next/link";
import HistoryBack from "@/components/HistoryBack";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { formatLbp, shopText } from "@/lib/shop/catalog";

function first(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

export default async function ShopCategoriesPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const raw = await searchParams;
    const q = (first(raw.q) ?? "").trim().slice(0, 80);
    const locale = await getLocale();
    const copy = messages(locale);
    const categories = await prisma.productCategory.findMany({
        where: q ? {
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { nameAr: { contains: q, mode: "insensitive" } },
            ],
        } : undefined,
        orderBy: { position: "asc" },
        include: { _count: { select: { products: true } } },
    });

    return (
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
            <HistoryBack fallback="/admin/shop" className="cursor-pointer text-sm text-emerald-800">{copy.shopBackProducts}</HistoryBack>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-2xl font-semibold">{copy.shopManageCategories}</h1>
                <Link href="/admin/shop/categories/new" className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950">{copy.shopAddCategory}</Link>
            </div>
            <form action="/admin/shop/categories" className="mt-6 flex flex-col gap-2 sm:flex-row">
                <input name="q" defaultValue={q} placeholder={copy.shopSearchCategories} className="w-full rounded-full border border-stone-300 bg-white px-4 py-3 text-sm" />
                <button type="submit" className="rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white">{copy.search}</button>
            </form>
            {categories.length === 0 ? (
                <p className="mt-8 rounded-3xl border border-stone-200 px-6 py-10 text-center text-stone-600">{copy.shopNoCategories}</p>
            ) : (
                <ul className="mt-6 flex flex-col gap-3">
                    {categories.map((category) => (
                        <li key={category.id}>
                            <Link href={`/admin/shop/categories/${category.id}`} className="flex items-center justify-between gap-4 rounded-3xl border border-stone-200 bg-white px-5 py-4 hover:border-emerald-700">
                                <span>
                                    <span className="block font-medium text-emerald-950">{shopText(locale, category.name, category.nameAr)}</span>
                                    <span className="mt-1 block text-sm text-stone-500">{locale === "ar" ? category.name : category.nameAr}</span>
                                </span>
                                <span className="shrink-0 text-sm text-stone-600">{formatLbp(category._count.products, locale)} {copy.shopProductCount}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
