import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/shop/AddToCartButton";
import CartLink from "@/components/shop/CartLink";
import ProductPhoto from "@/components/shop/ProductPhoto";
import ShopControls from "@/components/shop/ShopControls";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { parseShopQuery, shopHref, shopText } from "@/lib/shop/catalog";
import { presentPrice } from "@/lib/shop/money";
import { getDisplayCurrency, getPricing } from "@/lib/shop/pricing";
import { productPhotoSrc } from "@/lib/storage/files";

function first(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ cat?: string | string[]; q?: string | string[]; sort?: string | string[]; stock?: string | string[] }> }) {
    const raw = await searchParams;
    const filters = parseShopQuery({
        cat: first(raw.cat),
        q: first(raw.q),
        sort: first(raw.sort),
        stock: first(raw.stock),
    });
    const [locale, pricing, display] = await Promise.all([getLocale(), getPricing(), getDisplayCurrency()]);
    const copy = messages(locale);
    const categories = await prisma.productCategory.findMany({ orderBy: { position: "asc" } });
    const selected = categories.find((category) => category.id === filters.cat);

    const products = await prisma.product.findMany({
        where: {
            available: true,
            ...(filters.stock === "in" ? { stock: { gt: 0 } } : {}),
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
        orderBy: filters.sort === "price-asc" ? { price: "asc" } : filters.sort === "price-desc" ? { price: "desc" } : locale === "ar" ? { nameAr: "asc" } : { name: "asc" },
    });

    const pill = "shrink-0 rounded-full border px-4 py-2 text-sm whitespace-nowrap";

    return (
        <main className="bg-[#f6f1e8]">
            <div className="mx-auto w-full max-w-6xl px-5 py-8">
                <section className="relative overflow-hidden rounded-[2rem] bg-emerald-950 text-white">
                    <Image src="/images/clinic-shop.jpg" alt="" fill priority sizes="(min-width: 1024px) 72rem, 100vw" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/75 to-emerald-950/30" />
                    <div className="relative flex min-h-64 flex-col justify-end gap-6 p-6 sm:p-10">
                        <div className="max-w-xl">
                            <h1 className="text-4xl text-white sm:text-5xl">{copy.shopTitle}</h1>
                            <p className="mt-3 max-w-md text-sm leading-6 text-emerald-50 sm:text-base">{copy.shopLead}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <CartLink label={copy.shopCart} locale={locale} />
                            <Link href="/shop/orders" className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-white ring-1 ring-white/40 hover:bg-white/10">
                                {copy.shopOrders}
                            </Link>
                        </div>
                    </div>
                </section>

                <nav aria-label={copy.shopTitle} className="sticky top-16 z-10 -mx-5 mt-6 overflow-x-auto bg-[#f6f1e8]/95 px-5 py-3 backdrop-blur">
                    <div className="flex w-max gap-2">
                        <Link href={shopHref({ ...filters, cat: "" })} className={`${pill} ${filters.cat ? "border-stone-200 bg-white text-emerald-950" : "border-emerald-900 bg-emerald-900 text-white"}`}>
                            {copy.shopAll}
                        </Link>
                        {categories.map((category) => (
                            <Link
                                key={category.id}
                                href={shopHref({ ...filters, cat: category.id })}
                                className={`${pill} ${filters.cat === category.id ? "border-emerald-900 bg-emerald-900 text-white" : "border-stone-200 bg-white text-emerald-950 hover:border-emerald-700"}`}
                            >
                                {shopText(locale, category.name, category.nameAr)}
                            </Link>
                        ))}
                    </div>
                </nav>

                <div className="mt-4">
                    <ShopControls copy={copy} filters={filters} />
                </div>

                {products.length === 0 ? (
                    <p className="mt-10 rounded-3xl bg-white px-6 py-12 text-center text-stone-600 ring-1 ring-stone-200">{copy.shopEmpty}</p>
                ) : (
                    <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
                        {products.map((product) => {
                            const name = shopText(locale, product.name, product.nameAr);
                            const description = shopText(locale, product.description, product.descriptionAr);
                            return (
                            <li key={product.id} className="flex flex-col overflow-hidden rounded-[1.6rem] bg-white ring-1 ring-stone-200">
                                <Link href={`/shop/${product.id}`} className="relative block aspect-square bg-[#efe8dc]">
                                    <ProductPhoto src={productPhotoSrc(product.id, product.photoUrl)} alt={name} sizes="(min-width: 1024px) 22rem, 50vw" />
                                </Link>
                                <div className="flex flex-1 flex-col p-4">
                                    <p className="text-[0.7rem] font-medium tracking-wide text-emerald-800 uppercase">{shopText(locale, product.category.name, product.category.nameAr)}</p>
                                    <Link href={`/shop/${product.id}`} className="mt-1 font-medium text-emerald-950 hover:text-emerald-800">{name}</Link>
                                    {description && <p className="mt-1 line-clamp-2 text-sm leading-5 text-stone-500">{description}</p>}
                                    <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                                        <p className="text-sm font-medium text-emerald-950">{presentPrice(product.price, pricing.currency, display, pricing.rate, locale)}</p>
                                        <AddToCartButton productId={product.id} name={name} price={product.price} stock={product.stock} image={productPhotoSrc(product.id, product.photoUrl)} copy={copy} compact />
                                    </div>
                                </div>
                            </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </main>
    );
}
