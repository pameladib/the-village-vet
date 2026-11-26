import HistoryBack from "@/components/HistoryBack";
import { notFound, redirect } from "next/navigation";
import ProductPhoto from "@/components/shop/ProductPhoto";
import VariantPurchase from "@/components/shop/VariantPurchase";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { shopText } from "@/lib/shop/catalog";
import { getDisplayCurrency, getPricing } from "@/lib/shop/pricing";
import { productPhotoSrc } from "@/lib/storage/files";
import { refWhere } from "@/lib/slug";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const product = await prisma.product.findFirst({
        where: { ...refWhere(id), available: true },
        include: {
            category: { select: { name: true, nameAr: true } },
            variants: { orderBy: { position: "asc" } },
        },
    });
    if (!product || product.variants.length === 0) notFound();
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
                    <VariantPurchase
                        productName={name}
                        image={productPhotoSrc(product.id, product.photoUrl)}
                        variants={product.variants.map((variant) => ({
                            id: variant.id,
                            label: shopText(locale, variant.label, variant.labelAr),
                            price: variant.price,
                            stock: variant.stock,
                        }))}
                        copy={copy}
                        locale={locale}
                        currency={pricing.currency}
                        display={display}
                        rate={pricing.rate}
                    />
                </div>
            </div>
        </main>
    );
}
