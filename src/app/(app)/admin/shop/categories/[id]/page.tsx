import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CategoryForm from "@/components/shop/CategoryForm";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const { id } = await params;
    const category = await prisma.productCategory.findUnique({ where: { id }, select: { id: true, name: true, nameAr: true } });
    if (!category) notFound();

    const locale = await getLocale();
    const copy = messages(locale);

    return (
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
            <Link href="/admin/shop/categories" className="text-sm text-emerald-800">{copy.shopBackCategories}</Link>
            <h1 className="mt-3 text-2xl font-semibold">{copy.shopEditCategory}</h1>
            <CategoryForm copy={copy} category={category} />
        </main>
    );
}
