import HistoryBack from "@/components/HistoryBack";
import { notFound, redirect } from "next/navigation";
import ProductEditor from "@/components/shop/ProductEditor";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getPricing } from "@/lib/shop/pricing";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const { id } = await params;
    const [product, categories, pricing] = await Promise.all([
        prisma.product.findUnique({ where: { id } }),
        prisma.productCategory.findMany({ orderBy: { position: "asc" } }),
        getPricing(),
    ]);
    if (!product) notFound();

    const locale = await getLocale();
    const copy = messages(locale);

    return (
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
            <HistoryBack fallback="/admin/shop" className="cursor-pointer text-sm text-emerald-800">{copy.shopBackProducts}</HistoryBack>
            <h1 className="mt-3 text-2xl font-semibold">{copy.shopEditProduct}</h1>
            <ProductEditor copy={copy} locale={locale} categories={categories} product={product} currency={pricing.currency} />
        </main>
    );
}
