import HistoryBack from "@/components/HistoryBack";
import { notFound, redirect } from "next/navigation";
import AddToCartButton from "@/components/shop/AddToCartButton";
import ProductPhoto from "@/components/shop/ProductPhoto";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { shopText } from "@/lib/shop/catalog";
import { presentPrice } from "@/lib/shop/money";
import { getDisplayCurrency, getPricing } from "@/lib/shop/pricing";
import { productPhotoSrc } from "@/lib/storage/files";
import { refWhere } from "@/lib/slug";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const product = await prisma.product.findFirst({
        where: { ...refWhere(id), available: true },
        include: { category: { select: { name: true, nameAr: true } } },
    });
    if (!product) notFound();
    if (product.slug && id !== product.slug) redirect(`/shop/${product.slug}`);

    const [locale, pricing, display] = await Promise.all([getLocale(), getPricing(), getDisplayCurrency()]);
    const copy = messages(locale);
    const name = shopText(locale, product.name, product.nameAr);
    const description = shopText(locale, product.description, product.descriptionAr);

    return (
        <main className="bg-[#f6f1e8]">
            <div className="mx-auto w-full max-w-5xl px-5 pt-8 lg:pt-12">
                <HistoryBack fallback="/shop" className="cursor-pointer text-sm font-medium text-emerald-800">{copy.shopBackStore}</HistoryBack>
            </div>
            <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 pt-6 pb-8 lg:grid-cols-2 lg:pt-8 lg:pb-12">
                <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-[#efe8dc]">
                    <ProductPhoto src={productPhotoSrc(product.id, product.photoUrl)} alt={name} sizes="(min-width: 1024px) 36rem, 100vw" />
                </div>
                <div className="flex flex-col justify-center">
                    <p className="text-xs font-medium tracking-[0.16em] text-emerald-800 uppercase">{shopText(locale, product.category.name, product.category.nameAr)}</p>
                    <h1 className="mt-2 text-4xl text-emerald-950">{name}</h1>
                    {description && <p className="mt-4 max-w-md text-base leading-7 text-stone-600">{description}</p>}
                    <p className="mt-6 text-2xl text-emerald-950">{presentPrice(product.price, pricing.currency, display, pricing.rate, locale)}</p>
                    <p className="mt-2 text-sm text-stone-500">{product.stock > 0 ? copy.shopStockIn : copy.shopOut}</p>
                    <AddToCartButton productId={product.id} name={name} price={product.price} stock={product.stock} image={productPhotoSrc(product.id, product.photoUrl)} copy={copy} locale={locale} />
                </div>
            </div>
        </main>
    );
}
