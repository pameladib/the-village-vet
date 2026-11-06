import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductForm } from "@/components/shop/ShopAdmin";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminShopPage() {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const [categories, products] = await Promise.all([
        prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
        prisma.product.findMany({ orderBy: { name: "asc" } }),
    ]);

    return (
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
            <Link href="/dashboard" className="text-sm text-emerald-800">Back</Link>
            <h1 className="mt-3 text-2xl font-semibold">Shop products</h1>
            <p className="mt-1 text-sm text-stone-600">Prices are whole Lebanese pounds. Cash is collected when the order is picked up.</p>
            <div className="mt-4"><ProductForm categories={categories} /></div>
            <div className="mt-6 grid gap-3">
                {products.map((product) => <ProductForm key={product.id} categories={categories} product={product} />)}
            </div>
        </main>
    );
}
