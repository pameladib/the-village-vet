import Link from "next/link";
import { redirect } from "next/navigation";
import ProductEditor from "@/components/shop/ProductEditor";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getPricing } from "@/lib/shop/pricing";

export default async function NewProductPage() {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const [locale, pricing, categories] = await Promise.all([
        getLocale(),
        getPricing(),
        prisma.productCategory.findMany({ orderBy: { position: "asc" } }),
    ]);
    const copy = messages(locale);

    return (
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
            <Link href="/admin/shop" className="text-sm text-emerald-800">{copy.shopBackProducts}</Link>
            <h1 className="mt-3 text-2xl font-semibold">{copy.shopAddProduct}</h1>
            <ProductEditor copy={copy} locale={locale} categories={categories} currency={pricing.currency} />
        </main>
    );
}
