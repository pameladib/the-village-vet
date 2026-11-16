import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ProductEditor from "@/components/shop/ProductEditor";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const { id } = await params;
    const [product, categories] = await Promise.all([
        prisma.product.findUnique({ where: { id } }),
        prisma.productCategory.findMany({ orderBy: { position: "asc" } }),
    ]);
    if (!product) notFound();

    const locale = await getLocale();
    const copy = messages(locale);

    return (
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
            <Link href="/admin/shop" className="text-sm text-emerald-800">{copy.shopBackProducts}</Link>
            <h1 className="mt-3 text-2xl font-semibold">{copy.shopEditProduct}</h1>
            <ProductEditor copy={copy} locale={locale} categories={categories} product={product} />
        </main>
    );
}
