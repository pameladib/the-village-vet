import HistoryBack from "@/components/HistoryBack";
import { notFound, redirect } from "next/navigation";
import ProductEditor from "@/components/shop/ProductEditor";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getPricing } from "@/lib/shop/pricing";
import { refWhere } from "@/lib/slug";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const { id } = await params;
    const [product, categories, pricing] = await Promise.all([
        prisma.product.findUnique({
            where: refWhere(id),
            include: { variants: { orderBy: { position: "asc" } } },
        }),
        prisma.productCategory.findMany({ orderBy: { position: "asc" } }),
        getPricing(),
    ]);
    if (!product) notFound();
    if (product.slug && id !== product.slug) redirect(`/admin/shop/${product.slug}`);

    const locale = await getLocale();
    const copy = messages(locale);

    return (
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
            <HistoryBack fallback="/admin/shop" className="cursor-pointer text-sm text-emerald-800">{copy.shopBackProducts}</HistoryBack>
            <h1 className="mt-3 text-2xl font-semibold">{copy.shopEditProduct}</h1>
            <ProductEditor
                copy={copy}
                locale={locale}
                categories={categories}
                currency={pricing.currency}
                product={{
                    id: product.id,
                    name: product.name,
                    nameAr: product.nameAr,
                    description: product.description,
                    descriptionAr: product.descriptionAr,
                    available: product.available,
                    categoryId: product.categoryId,
                    photoUrl: product.photoUrl,
                    variants: product.variants.map((variant) => ({
                        id: variant.id,
                        label: variant.label,
                        labelAr: variant.labelAr,
                        price: variant.price,
                        stock: variant.stock,
                    })),
                }}
            />
        </main>
    );
}
