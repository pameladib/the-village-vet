import Link from "next/link";
import { redirect } from "next/navigation";
import CurrencySwitch from "@/components/CurrencySwitch";
import ProductPhoto from "@/components/shop/ProductPhoto";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { adminShopHref, formatLbp, parseShopQuery, shopText } from "@/lib/shop/catalog";
import { presentPrice } from "@/lib/shop/money";
import { getDisplayCurrency, getPricing } from "@/lib/shop/pricing";
import { productPhotoSrc } from "@/lib/storage/files";

function first(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

export default async function AdminShopPage({ searchParams }: { searchParams: Promise<{ cat?: string | string[]; q?: string | string[] }> }) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const raw = await searchParams;
    const filters = parseShopQuery({ cat: first(raw.cat), q: first(raw.q) });
    const [locale, pricing, display] = await Promise.all([getLocale(), getPricing(), getDisplayCurrency()]);
    const copy = messages(locale);
    const categories = await prisma.productCategory.findMany({ orderBy: { position: "asc" } });
    const selected = categories.find((category) => category.id === filters.cat);
    const products = await prisma.product.findMany({
        where: {
            ...(selected ? { categoryId: selected.id } : {}),
            ...(filters.q ? {
                OR: [
                    { name: { contains: filters.q, mode: "insensitive" } },
                    { nameAr: { contains: filters.q, mode: "insensitive" } },
                    { description: { contains: filters.q, mode: "insensitive" } },
                    { descriptionAr: { contains: filters.q, mode: "insensitive" } },
                ],
            } : {}),
        },
        include: { category: { select: { name: true, nameAr: true } } },
        orderBy: locale === "ar" ? { nameAr: "asc" } : { name: "asc" },
    });
    const pill = "shrink-0 rounded-full border px-4 py-2 text-sm whitespace-nowrap";

    return (
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">{copy.products}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <CurrencySwitch currency={display} label={copy.currency} />
                    <Link href="/admin/shop/categories" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50">{copy.shopManageCategories}</Link>
                    <Link href="/admin/shop/new" className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950">{copy.shopAddProduct}</Link>
                </div>
            </div>

            <nav aria-label={copy.shopManageCategories} className="mt-6 flex gap-2 overflow-x-auto">
                <Link href={adminShopHref("", filters.q)} className={`${pill} ${selected ? "border-stone-200 bg-white" : "border-emerald-900 bg-emerald-900 text-white"}`}>{copy.shopAll}</Link>
                {categories.map((category) => (
                    <Link key={category.id} href={adminShopHref(category.id, filters.q)} className={`${pill} ${selected?.id === category.id ? "border-emerald-900 bg-emerald-900 text-white" : "border-stone-200 bg-white hover:border-emerald-700"}`}>
                        {shopText(locale, category.name, category.nameAr)}
                    </Link>
                ))}
            </nav>
            <form action="/admin/shop" className="mt-4 flex flex-col gap-2 sm:flex-row">
                {selected && <input type="hidden" name="cat" value={selected.id} />}
                <input name="q" defaultValue={filters.q} placeholder={copy.shopSearchPlaceholder} className="w-full rounded-full border border-stone-300 bg-white px-4 py-3 text-sm" />
                <button type="submit" className="rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white">{copy.search}</button>
            </form>

            {products.length === 0 ? (
                <p className="mt-8 rounded-3xl border border-stone-200 px-6 py-10 text-center text-stone-600">{copy.shopNoProducts}</p>
            ) : (
                <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
                    {products.map((product) => {
                        const name = shopText(locale, product.name, product.nameAr);
                        return (
                            <li key={product.id} className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
                                <Link href={`/admin/shop/${product.id}`} className="relative block aspect-square bg-[#efe8dc]">
                                    <ProductPhoto src={productPhotoSrc(product.id, product.photoUrl)} alt={name} sizes="(min-width: 1024px) 20rem, 50vw" />
                                </Link>
                                <div className="p-4">
                                    <p className="text-xs font-medium tracking-wide text-emerald-800 uppercase">{shopText(locale, product.category.name, product.category.nameAr)}</p>
                                    <Link href={`/admin/shop/${product.id}`} className="mt-1 block font-medium text-emerald-950 hover:text-emerald-800">{name}</Link>
                                    <p className="text-sm text-stone-500">{locale === "ar" ? product.name : product.nameAr}</p>
                                    <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                                        <span>{presentPrice(product.price, pricing.currency, display, pricing.rate, locale)}</span>
                                        <span className="text-stone-500">{product.stock > 0 ? formatLbp(product.stock, locale) : copy.shopOut}</span>
                                    </div>
                                    {!product.available && <p className="mt-2 text-xs font-medium text-stone-500">{copy.shopHidden}</p>}
                                    <Link href={`/admin/shop/${product.id}`} className="mt-3 inline-flex text-sm font-medium text-emerald-800">{copy.shopEdit}</Link>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </main>
    );
}
